import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import {
  crossfitWorkouts,
  crossfitMovements,
  crossfitWorkoutMovements,
  crossfitUserScores,
  crossfitUserMovementPerformance,
  crossfitWorkoutCategories,
  crossfitUsers,
} from '@/db/schema';
import { eq, and, isNull, inArray, asc } from 'drizzle-orm';

// ============================================================
// TYPES
// ============================================================

interface WorkoutForEnrichment {
  id: number;
  rawTitle: string | null;
  rawDescription: string;
  isMonthlyChallenge: boolean | null;
}

interface ScoreForAnalysis {
  id: number;
  workoutId: number;
  rawScore: string;
  rawDivision: string | null;
  rawNotes: string | null;
  workoutDate: Date;
  rawDescription: string;
  rawTitle: string | null;
}

interface LLMMovementResult {
  name: string;
  movement_type?: string;
  is_weighted?: boolean;
  prescribed_reps_per_set: number | null;
  prescribed_sets?: number | null;
  prescribed_weight: number | null;
  prescribed_unit?: string | null;
  estimated_actual_weight: number | null;
  estimated_max_weight: number | null;
  estimated_reps_per_set: number | null;
  estimated_reps_completed?: number | null;
  is_limiting_factor: boolean;
  order_in_workout?: number;
}

interface LLMWorkoutResult {
  workout_type: string;
  title_evaluation: {
    action: 'keep' | 'ai_generated' | 'ai_corrected';
    canonical_title: string;
  };
  score_interpretation: {
    score_type: string;
    confidence: string;
    [key: string]: unknown;
  };
  movements: LLMMovementResult[];
  category: string;
  similarity_label: string;
  summary: string;
  is_monthly_challenge?: boolean;
  monthly_challenge_detail?: {
    challenge_type: string;
    challenge_month: string;
    daily_goal: string;
    unit: string;
  };
}

interface ScoreValidationResult {
  score_id: number;
  validated: boolean;
  corrected_interpretation?: {
    score_type: string;
    estimated_max_weight: number;
    reasoning: string;
  };
}

interface ScalingInferenceResult {
  movement_name: string;
  inferred_scaling_detail: string;
  is_limiting_factor: boolean;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================
// HELPERS
// ============================================================

function parseNumeric(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  if (typeof value === 'string') {
    const match = value.match(/^[\s]*([0-9]+(?:\.[0-9]+)?)/);
    if (match) return parseFloat(match[1]);
  }
  return null;
}

function parseInteger(value: unknown): number | null {
  const n = parseNumeric(value);
  return n != null ? Math.round(n) : null;
}

function inferWorkoutType(descLower: string): string {
  if (descLower.includes('for time')) return 'for_time';
  if (descLower.includes('amrap')) return 'amrap';
  if (descLower.includes('emom') || descLower.includes('every ')) return 'emom';
  if (descLower.includes('for load')) return 'for_load';
  if (descLower.includes('tabata')) return 'tabata';
  if (descLower.includes('for reps')) return 'for_reps';
  return 'other';
}

// ============================================================
// CATEGORY LOOKUP
// ============================================================

let categoryCache: Map<string, number> | null = null;

async function getCategoryMap(): Promise<Map<string, number>> {
  if (categoryCache) return categoryCache;
  const categories = await db.select().from(crossfitWorkoutCategories);
  categoryCache = new Map(categories.map((c) => [c.name, c.id]));
  return categoryCache;
}

async function getOrCreateCategory(name: string): Promise<number | null> {
  const map = await getCategoryMap();
  if (map.has(name)) return map.get(name)!;

  // AI proposed a new category — find the best parent type
  const parentType = inferParentType(name);
  try {
    const [inserted] = await db
      .insert(crossfitWorkoutCategories)
      .values({ name, parentType, isDefault: false })
      .returning({ id: crossfitWorkoutCategories.id });
    map.set(name, inserted.id);
    return inserted.id;
  } catch {
    // Likely a unique constraint violation from concurrent insert
    const existing = await db
      .select({ id: crossfitWorkoutCategories.id })
      .from(crossfitWorkoutCategories)
      .where(eq(crossfitWorkoutCategories.name, name))
      .limit(1);
    if (existing.length > 0) {
      map.set(name, existing[0].id);
      return existing[0].id;
    }
    return null;
  }
}

function inferParentType(categoryName: string): string {
  const lower = categoryName.toLowerCase();
  if (lower.includes('strength') || lower.includes('lifting') || lower.includes('barbell')) return 'strength';
  if (lower.includes('olympic')) return 'strength';
  if (lower.includes('metcon') || lower.includes('chipper') || lower.includes('engine') || lower.includes('conditioning')) return 'conditioning';
  if (lower.includes('gymnastics') || lower.includes('bodyweight') || lower.includes('skill')) return 'skill_gymnastics';
  if (lower.includes('challenge')) return 'challenge';
  return 'other';
}

// ============================================================
// MOVEMENT CATALOG
// ============================================================

let movementCache: Map<string, number> | null = null;

async function getMovementMap(): Promise<Map<string, number>> {
  if (movementCache) return movementCache;
  const movements = await db.select().from(crossfitMovements);
  movementCache = new Map(movements.map((m) => [m.canonicalName.toLowerCase(), m.id]));
  return movementCache;
}

async function getOrCreateMovement(
  name: string,
  movementType?: string,
  isWeighted?: boolean
): Promise<number> {
  const map = await getMovementMap();
  const key = name.toLowerCase().trim();
  if (map.has(key)) return map.get(key)!;

  try {
    const [inserted] = await db
      .insert(crossfitMovements)
      .values({
        canonicalName: name.trim(),
        movementType: movementType || null,
        isWeighted: isWeighted ?? false,
      })
      .returning({ id: crossfitMovements.id });
    map.set(key, inserted.id);
    return inserted.id;
  } catch {
    // Unique constraint violation
    const existing = await db
      .select({ id: crossfitMovements.id })
      .from(crossfitMovements)
      .where(eq(crossfitMovements.canonicalName, name.trim()))
      .limit(1);
    if (existing.length > 0) {
      map.set(key, existing[0].id);
      return existing[0].id;
    }
    throw new Error(`Failed to create or find movement: ${name}`);
  }
}

// ============================================================
// STAGE 3: AI ENRICHMENT
// ============================================================

const ENRICHMENT_SYSTEM_PROMPT = `You are a CrossFit workout analyst. You deeply understand CrossFit programming, scoring conventions, and the PushPress platform.

For each workout, you will:
1. Evaluate the raw title (is it a real workout name, a category label, or missing?)
2. Assign a category
3. Extract all movements
4. Determine workout type and provide a summary

TITLE EVALUATION:
For each workout, evaluate the raw title:
- MEANINGFUL TITLE: The title names the specific workout (e.g., "Fran", "Murph", "Push Press"). Keep as canonicalTitle, action = 'keep'
- CATEGORY LABEL: The title describes a category, not this workout (e.g., "Post-workout accessory", "Pre-workout skill", "For Time:", "For load:"). Generate a canonicalTitle from the description. action = 'ai_corrected'
- EMPTY/MISSING: No title provided. Generate a canonicalTitle from the description. action = 'ai_generated'

When generating a title, be concise:
- Named benchmarks: Use the name (e.g., "Kelly", "Annie")
- Strength work: "[Movement] [Rep Scheme]" (e.g., "Push Press 2-2-2-2-2")
- Metcons: Brief descriptor (e.g., "KB Snatch + Swing Triplet")
- Themed workouts: Use the theme if discernible

CRITICAL SCORING KNOWLEDGE:
- PushPress "For load" workouts often record scores as "total_reps @ sum_of_all_weights" where the weight is the SUM across ALL sets.
  Example: Push press 2-2-2-2-2 scored "10 @ 410" means 5 sets of 2 at varying weights that total 410 (avg ~82 lbs/set).
- Some workouts combine multiple lift maxes into one total.
- "For time" workouts that hit the time cap get scored as total reps.
- AMRAP scores are "rounds + reps" format.
- Freeform text scores contain real data.

Assign each workout ONE primary category from this list:
STRENGTH: "Heavy Barbell Strength", "Olympic Lifting", "Accessory Strength"
CONDITIONING: "Sprint Metcon", "Mid-Length Metcon", "Long Chipper / Grinder", "Engine Builder"
SKILL/GYMNASTICS: "Gymnastics Skill", "Bodyweight Conditioning"
OTHER: "Mixed Modal Test", "Active Recovery / Mobility"
CHALLENGE: "Monthly Challenge"

If none fit, you may propose a new category name.

MONTHLY CHALLENGES / NON-WORKOUT ENTRIES:
- Entries like "Complete 5 minutes of Core every day in March", step tracking, hydration tracking, etc.
- Set is_monthly_challenge = true, category = "Monthly Challenge", workout_type = "other"
- Include monthly_challenge_detail with challenge_type, challenge_month, daily_goal, unit
- Do NOT extract movements from monthly challenges.

MOVEMENT EXTRACTION:
For each movement, provide:
- name: Singular, standard CrossFit name ("Back Squat", not "Back Squats")
- movement_type: barbell | dumbbell | kettlebell | gymnastics | bodyweight | monostructural | accessory | other
- is_weighted: true if weight tracking is meaningful
- prescribed_reps_per_set, prescribed_sets, prescribed_weight (Rx in lbs), order_in_workout
- estimated_actual_weight: typical working weight
- estimated_max_weight: heaviest single-rep weight in THIS workout (not extrapolated 1RM). For sum-of-weights scoring, divide intelligently.
- estimated_reps_per_set: critical for distinguishing heavy work vs metcon
- is_limiting_factor: for scaled workouts, which movement(s) likely caused scaling
- If the athlete provided personal notes, USE THEM for scaling attribution

For similarity_label, use lowercase-kebab-case strings grouping comparable workouts.

Respond ONLY with a JSON array matching the input order. No markdown, no explanation.`;

const BATCH_SIZE = 8;
const MAX_CONCURRENT = 2;

function buildEnrichmentPrompt(workouts: WorkoutForEnrichment[]): string {
  return workouts
    .map(
      (w, i) =>
        `[${i + 1}] Title: "${w.rawTitle || ''}"
    Description: "${w.rawDescription.replace(/"/g, '\\"')}"
    Monthly Challenge Flag: ${w.isMonthlyChallenge}`
    )
    .join('\n\n');
}

function buildScorePrompt(scores: ScoreForAnalysis[]): string {
  return scores
    .map(
      (s, i) =>
        `[${i + 1}] Title: "${s.rawTitle || ''}"
    Description: "${s.rawDescription.replace(/"/g, '\\"')}"
    Score: "${s.rawScore}"
    Division: "${s.rawDivision || 'Unknown'}"${s.rawNotes ? `\n    Personal Notes: "${s.rawNotes.replace(/"/g, '\\"')}"` : ''}`
    )
    .join('\n\n');
}

const SCORE_SYSTEM_PROMPT = `You are a CrossFit workout analyst. For each user score, interpret the score and extract per-movement performance data.

CRITICAL SCORING KNOWLEDGE:
- PushPress "For load" workouts often record scores as "total_reps @ sum_of_all_weights" where the weight is the SUM across ALL sets.
- Some workouts combine multiple lift maxes into one total.
- "For time" workouts that hit the time cap get scored as total reps.
- AMRAP scores are "rounds + reps" format.

For each score, provide:
- score_type: time | rounds_reps | reps | max_weight | sum_of_weights | combined_total | reps_at_fixed_weight | distance | calories | complete | unknown
- confidence: high | medium | low
- Any relevant fields: total_weight_recorded, estimated_sets, estimated_max_weight, etc.

For each movement in the workout, provide per-movement performance:
- name: same canonical name as the workout's movement
- estimated_actual_weight, estimated_max_weight, estimated_reps_completed
- is_limiting_factor: for scaled workouts only
- If personal notes explain scaling, USE THEM

Respond ONLY with a JSON array matching input order. Each item:
{
  "score_interpretation": { "score_type": "...", "confidence": "...", ... },
  "movement_performance": [{ "name": "...", "estimated_actual_weight": ..., "estimated_max_weight": ..., "estimated_reps_completed": ..., "is_limiting_factor": false }],
  "summary": "brief one-line summary"
}`;

async function analyzeEnrichmentBatch(
  client: Anthropic,
  workouts: WorkoutForEnrichment[]
): Promise<LLMWorkoutResult[]> {
  const userMessage = buildEnrichmentPrompt(workouts);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: ENRICHMENT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseJSONResponse(text, workouts.length);
}

interface ScoreLLMResult {
  score_interpretation: {
    score_type: string;
    confidence: string;
    [key: string]: unknown;
  };
  movement_performance: {
    name: string;
    estimated_actual_weight: number | null;
    estimated_max_weight: number | null;
    estimated_reps_completed: number | null;
    is_limiting_factor: boolean;
  }[];
  summary: string;
}

async function analyzeScoreBatch(
  client: Anthropic,
  scores: ScoreForAnalysis[]
): Promise<ScoreLLMResult[]> {
  const userMessage = buildScorePrompt(scores);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: SCORE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseJSONResponse(text, scores.length);
}

function parseJSONResponse<T>(text: string, expectedCount: number): T[] {
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  let results: T[];
  try {
    results = JSON.parse(jsonStr);
  } catch {
    const lastCompleteObj = jsonStr.lastIndexOf('},');
    if (lastCompleteObj > 0) {
      const salvaged = jsonStr.substring(0, lastCompleteObj + 1) + ']';
      results = JSON.parse(salvaged);
    } else {
      throw new Error('Failed to parse LLM JSON response');
    }
  }

  if (results.length !== expectedCount && results.length > 0 && results.length < expectedCount) {
    console.warn(`LLM returned ${results.length} of ${expectedCount} results — processing partial batch`);
  }

  return results;
}

// ============================================================
// STAGE 3: STORE ENRICHMENT RESULTS
// ============================================================

async function storeEnrichmentResult(
  workoutId: number,
  result: LLMWorkoutResult
): Promise<void> {
  const categoryId = await getOrCreateCategory(result.category);

  const titleSource = result.title_evaluation?.action === 'keep' ? 'raw'
    : result.title_evaluation?.action === 'ai_corrected' ? 'ai_corrected'
    : 'ai_generated';

  await db
    .update(crossfitWorkouts)
    .set({
      canonicalTitle: result.title_evaluation?.canonical_title || null,
      titleSource,
      workoutType: result.workout_type,
      categoryId,
      similarityCluster: result.similarity_label,
      aiSummary: result.summary,
      isMonthlyChallenge: result.is_monthly_challenge ?? false,
    })
    .where(eq(crossfitWorkouts.id, workoutId));

  // Insert movements into catalog and junction table
  const validMovements = (result.movements || []).filter(
    (m) => m.name && typeof m.name === 'string' && m.name.trim() !== ''
  );

  for (let i = 0; i < validMovements.length; i++) {
    const m = validMovements[i];
    const movementId = await getOrCreateMovement(
      m.name,
      m.movement_type,
      m.is_weighted
    );

    await db.insert(crossfitWorkoutMovements).values({
      workoutId,
      movementId,
      prescribedReps: parseInteger(m.prescribed_reps_per_set),
      prescribedSets: parseInteger(m.prescribed_sets),
      prescribedWeight: parseNumeric(m.prescribed_weight),
      prescribedUnit: m.prescribed_unit || (m.prescribed_weight ? 'lbs' : null),
      orderInWorkout: m.order_in_workout ?? i + 1,
    });
  }
}

// ============================================================
// STAGE 3 + SCORE ANALYSIS: STORE SCORE RESULTS
// ============================================================

async function storeScoreResult(
  scoreId: number,
  result: ScoreLLMResult
): Promise<void> {
  await db
    .update(crossfitUserScores)
    .set({
      scoreType: result.score_interpretation?.score_type || 'unknown',
      aiScoreInterpretation: JSON.stringify(result.score_interpretation),
      aiAnalysis: JSON.stringify(result),
    })
    .where(eq(crossfitUserScores.id, scoreId));

  // Insert movement performance records
  const validPerf = (result.movement_performance || []).filter(
    (m) => m.name && typeof m.name === 'string' && m.name.trim() !== ''
  );

  for (const perf of validPerf) {
    const movementMap = await getMovementMap();
    const movementId = movementMap.get(perf.name.toLowerCase().trim());
    if (!movementId) continue; // Movement wasn't in the catalog — skip

    await db.insert(crossfitUserMovementPerformance).values({
      userScoreId: scoreId,
      movementId,
      estimatedActualWeight: parseNumeric(perf.estimated_actual_weight),
      estimatedMaxWeight: parseNumeric(perf.estimated_max_weight),
      estimatedRepsCompleted: parseInteger(perf.estimated_reps_completed),
      isLimitingFactor: perf.is_limiting_factor ?? false,
      confidence: 'medium',
    });
  }
}

// ============================================================
// STAGE 4: SCORE VALIDATION
// ============================================================

const VALIDATION_SYSTEM_PROMPT = `You are validating score interpretations for a CrossFit athlete.

For each strength workout score below, I'm providing:
1. The workout description and score
2. The AI's initial interpretation (estimated max weight)
3. The user's HISTORICAL performance on the same or similar movements

Your job: Does the interpretation make sense given their history?

VALIDATION RULES:
- If the estimated max is >30% higher than their previous best for that movement, the score is LIKELY a sum-of-weights. Re-interpret.
- If the estimated max is >50% higher, it is ALMOST CERTAINLY a sum-of-weights or combined total. Re-interpret with high confidence.
- Consider the rep scheme: "2-2-2-2-2" at a given score is almost always sum-of-weights. "1-1-1-1-1" could be either.
- If "For load" with multiple sets, default to sum-of-weights unless resulting per-set weight is plausible.

For each score, respond with JSON:
{ "score_id": N, "validated": true/false, "corrected_interpretation": { "score_type": "...", "estimated_max_weight": N, "reasoning": "..." } }

Respond with a JSON array. No markdown.`;

async function runScoreValidation(
  client: Anthropic,
  userId: number
): Promise<void> {
  // Get all strength/load scores for this user that have AI analysis
  const scores = await db
    .select({
      id: crossfitUserScores.id,
      workoutId: crossfitUserScores.workoutId,
      aiScoreInterpretation: crossfitUserScores.aiScoreInterpretation,
      rawScore: crossfitUserScores.rawScore,
    })
    .from(crossfitUserScores)
    .where(
      and(
        eq(crossfitUserScores.userId, userId),
        eq(crossfitUserScores.scoreType, 'max_weight')
      )
    );

  if (scores.length === 0) return;

  // Get user's movement performance history for context
  const allPerformance = await db
    .select({
      movementId: crossfitUserMovementPerformance.movementId,
      estimatedMaxWeight: crossfitUserMovementPerformance.estimatedMaxWeight,
      canonicalName: crossfitMovements.canonicalName,
    })
    .from(crossfitUserMovementPerformance)
    .innerJoin(
      crossfitMovements,
      eq(crossfitUserMovementPerformance.movementId, crossfitMovements.id)
    )
    .innerJoin(
      crossfitUserScores,
      eq(crossfitUserMovementPerformance.userScoreId, crossfitUserScores.id)
    )
    .where(eq(crossfitUserScores.userId, userId));

  // Build history per movement
  const historyByMovement = new Map<string, number[]>();
  for (const p of allPerformance) {
    if (!p.estimatedMaxWeight) continue;
    const key = p.canonicalName;
    if (!historyByMovement.has(key)) historyByMovement.set(key, []);
    historyByMovement.get(key)!.push(p.estimatedMaxWeight);
  }

  // Build validation prompt for scores that look suspicious
  const scoresToValidate: { id: number; prompt: string }[] = [];

  for (const score of scores) {
    if (!score.aiScoreInterpretation) continue;
    let interp;
    try { interp = JSON.parse(score.aiScoreInterpretation); } catch { continue; }

    const workout = await db
      .select({ rawDescription: crossfitWorkouts.rawDescription })
      .from(crossfitWorkouts)
      .where(eq(crossfitWorkouts.id, score.workoutId))
      .limit(1);

    if (workout.length === 0) continue;

    // Get movements for this score
    const scorePerf = await db
      .select({
        canonicalName: crossfitMovements.canonicalName,
        estimatedMaxWeight: crossfitUserMovementPerformance.estimatedMaxWeight,
      })
      .from(crossfitUserMovementPerformance)
      .innerJoin(crossfitMovements, eq(crossfitUserMovementPerformance.movementId, crossfitMovements.id))
      .where(eq(crossfitUserMovementPerformance.userScoreId, score.id));

    for (const perf of scorePerf) {
      if (!perf.estimatedMaxWeight) continue;
      const history = historyByMovement.get(perf.canonicalName) || [];
      const previousBest = history.length > 0 ? Math.max(...history.filter((w) => w !== perf.estimatedMaxWeight)) : 0;

      if (previousBest > 0 && perf.estimatedMaxWeight > previousBest * 1.3) {
        scoresToValidate.push({
          id: score.id,
          prompt: `Score ID: ${score.id}\nWorkout: ${workout[0].rawDescription.substring(0, 200)}\nRaw Score: ${score.rawScore}\nMovement: ${perf.canonicalName}\nAI estimated max: ${perf.estimatedMaxWeight} lbs\nUser's previous best for ${perf.canonicalName}: ${previousBest} lbs\nCurrent interpretation: ${JSON.stringify(interp)}`,
        });
      }
    }
  }

  if (scoresToValidate.length === 0) return;

  // Batch validate
  const batchPrompt = scoresToValidate.map((s) => s.prompt).join('\n\n---\n\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: VALIDATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: batchPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const validations: ScoreValidationResult[] = parseJSONResponse(text, scoresToValidate.length);

    for (const v of validations) {
      if (!v.validated && v.corrected_interpretation) {
        await db
          .update(crossfitUserScores)
          .set({
            scoreType: v.corrected_interpretation.score_type,
            aiScoreInterpretation: JSON.stringify({
              ...JSON.parse((await db.select({ ai: crossfitUserScores.aiScoreInterpretation }).from(crossfitUserScores).where(eq(crossfitUserScores.id, v.score_id)).limit(1))[0]?.ai || '{}'),
              score_validated: false,
              corrected_max_weight: v.corrected_interpretation.estimated_max_weight,
              validation_reasoning: v.corrected_interpretation.reasoning,
            }),
          })
          .where(eq(crossfitUserScores.id, v.score_id));
      } else {
        // Mark as validated
        const existing = await db.select({ ai: crossfitUserScores.aiScoreInterpretation }).from(crossfitUserScores).where(eq(crossfitUserScores.id, v.score_id)).limit(1);
        if (existing.length > 0 && existing[0].ai) {
          await db
            .update(crossfitUserScores)
            .set({
              aiScoreInterpretation: JSON.stringify({
                ...JSON.parse(existing[0].ai),
                score_validated: true,
              }),
            })
            .where(eq(crossfitUserScores.id, v.score_id));
        }
      }
    }
  } catch (err) {
    console.error('Score validation failed:', err);
    // Non-fatal — scores are usable without validation
  }
}

// ============================================================
// STAGE 5: SCALING INFERENCE
// ============================================================

const SCALING_SYSTEM_PROMPT = `This athlete did the following workout(s) SCALED (not Rx).
PushPress does not export workout notes, so we don't know exactly what they modified.

For each scaled workout, given the Rx description and the athlete's Rx history for each movement, infer:
1. Which movement(s) did they MOST LIKELY scale?
2. What modification did they probably make?
   Common patterns: ring muscle-ups → pull-ups, handstand push-ups → DB push press, heavy barbell → lighter weight, rope climbs → half height, box jumps → step-ups, double-unders → single-unders, pistols → air squats
3. Confidence level:
   - HIGH: athlete has never done this movement Rx in any workout
   - MEDIUM: athlete sometimes does it Rx, sometimes not
   - LOW: athlete usually does it Rx (they may have scaled weight only)

Respond with JSON array, one item per workout:
[{ "movements": [{ "name": "...", "inferred_scaling_detail": "...", "is_limiting_factor": true/false, "confidence": "high|medium|low" }] }]

No markdown.`;

async function runScalingInference(
  client: Anthropic,
  userId: number
): Promise<void> {
  // Get scaled scores without notes (notes would already explain scaling)
  const scaledScores = await db
    .select({
      id: crossfitUserScores.id,
      workoutId: crossfitUserScores.workoutId,
      rawScore: crossfitUserScores.rawScore,
      rawNotes: crossfitUserScores.rawNotes,
    })
    .from(crossfitUserScores)
    .where(
      and(
        eq(crossfitUserScores.userId, userId),
        eq(crossfitUserScores.rawDivision, 'Scaled')
      )
    );

  // Only infer for scores without notes
  const needsInference = scaledScores.filter((s) => !s.rawNotes?.trim());
  if (needsInference.length === 0) return;

  // Get user's Rx history for movements
  const rxScores = await db
    .select({ id: crossfitUserScores.id })
    .from(crossfitUserScores)
    .where(
      and(
        eq(crossfitUserScores.userId, userId),
        eq(crossfitUserScores.rawDivision, 'Rx')
      )
    );

  const rxScoreIds = rxScores.map((s) => s.id);
  const rxMovementIds = new Set<number>();

  if (rxScoreIds.length > 0) {
    const rxPerf = await db
      .select({ movementId: crossfitUserMovementPerformance.movementId })
      .from(crossfitUserMovementPerformance)
      .where(inArray(crossfitUserMovementPerformance.userScoreId, rxScoreIds));

    for (const p of rxPerf) rxMovementIds.add(p.movementId);
  }

  // Process in batches of 10
  for (let i = 0; i < needsInference.length; i += 10) {
    const batch = needsInference.slice(i, i + 10);
    const prompts: string[] = [];

    for (const score of batch) {
      const workout = await db
        .select({ rawDescription: crossfitWorkouts.rawDescription })
        .from(crossfitWorkouts)
        .where(eq(crossfitWorkouts.id, score.workoutId))
        .limit(1);

      if (workout.length === 0) continue;

      const workoutMovements = await db
        .select({
          movementId: crossfitWorkoutMovements.movementId,
          canonicalName: crossfitMovements.canonicalName,
        })
        .from(crossfitWorkoutMovements)
        .innerJoin(crossfitMovements, eq(crossfitWorkoutMovements.movementId, crossfitMovements.id))
        .where(eq(crossfitWorkoutMovements.workoutId, score.workoutId));

      const movementRxHistory = workoutMovements.map((m) => ({
        name: m.canonicalName,
        hasRxHistory: rxMovementIds.has(m.movementId),
      }));

      prompts.push(`Score ID: ${score.id}\nWorkout: ${workout[0].rawDescription.substring(0, 300)}\nScore: ${score.rawScore}\nMovement Rx history:\n${movementRxHistory.map((m) => `  ${m.name}: ${m.hasRxHistory ? 'Has done Rx' : 'Never done Rx'}`).join('\n')}`);
    }

    if (prompts.length === 0) continue;

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SCALING_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompts.join('\n\n---\n\n') }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const inferences: { movements: ScalingInferenceResult[] }[] = parseJSONResponse(text, prompts.length);

      for (let j = 0; j < Math.min(inferences.length, batch.length); j++) {
        const scoreId = batch[j].id;
        const inference = inferences[j];

        // Update movement performance records with scaling inferences
        for (const inf of inference.movements) {
          const movementMap = await getMovementMap();
          const movementId = movementMap.get(inf.movement_name?.toLowerCase().trim() || '');
          if (!movementId) continue;

          // Find existing performance record for this score + movement
          const existingPerf = await db
            .select({ id: crossfitUserMovementPerformance.id })
            .from(crossfitUserMovementPerformance)
            .where(
              and(
                eq(crossfitUserMovementPerformance.userScoreId, scoreId),
                eq(crossfitUserMovementPerformance.movementId, movementId)
              )
            )
            .limit(1);

          if (existingPerf.length > 0) {
            await db
              .update(crossfitUserMovementPerformance)
              .set({
                inferredScalingDetail: inf.inferred_scaling_detail,
                isLimitingFactor: inf.is_limiting_factor,
                confidence: inf.confidence,
              })
              .where(eq(crossfitUserMovementPerformance.id, existingPerf[0].id));
          } else {
            await db.insert(crossfitUserMovementPerformance).values({
              userScoreId: scoreId,
              movementId,
              inferredScalingDetail: inf.inferred_scaling_detail,
              isLimitingFactor: inf.is_limiting_factor,
              confidence: inf.confidence,
            });
          }
        }
      }
    } catch (err) {
      console.error('Scaling inference batch failed:', err);
      // Non-fatal
    }
  }
}

// ============================================================
// ORCHESTRATOR: Process a chunk of analysis
// ============================================================

export async function processAnalysisChunk(
  userId: number,
  chunkSize: number = 20
): Promise<{ processed: number; remaining: number; total: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({ apiKey });

  // Reset caches for fresh run
  categoryCache = null;
  movementCache = null;

  // -----------------------------------------------------------
  // Stage 3: Enrich un-enriched workouts
  // -----------------------------------------------------------
  const unenrichedWorkouts = await db
    .select({
      id: crossfitWorkouts.id,
      rawTitle: crossfitWorkouts.rawTitle,
      rawDescription: crossfitWorkouts.rawDescription,
      isMonthlyChallenge: crossfitWorkouts.isMonthlyChallenge,
    })
    .from(crossfitWorkouts)
    .where(isNull(crossfitWorkouts.workoutType));

  // Count un-analyzed scores for this user
  const unanalyzedScores = await db
    .select({
      id: crossfitUserScores.id,
      workoutId: crossfitUserScores.workoutId,
      rawScore: crossfitUserScores.rawScore,
      rawDivision: crossfitUserScores.rawDivision,
      rawNotes: crossfitUserScores.rawNotes,
      workoutDate: crossfitUserScores.workoutDate,
    })
    .from(crossfitUserScores)
    .where(
      and(
        eq(crossfitUserScores.userId, userId),
        isNull(crossfitUserScores.aiAnalysis)
      )
    );

  const totalWork = unenrichedWorkouts.length + unanalyzedScores.length;

  // Nothing left to enrich/analyze — run final passes and mark complete
  if (totalWork === 0) {
    // Run validation & inference only once all enrichment/analysis is done
    try {
      await db
        .update(crossfitUsers)
        .set({ analysisStatus: 'analyzing', analysisProgress: 97 })
        .where(eq(crossfitUsers.id, userId));
      await runScoreValidation(client, userId);
    } catch (err) {
      console.error('Score validation stage failed:', err);
    }

    try {
      await db
        .update(crossfitUsers)
        .set({ analysisProgress: 99 })
        .where(eq(crossfitUsers.id, userId));
      await runScalingInference(client, userId);
    } catch (err) {
      console.error('Scaling inference stage failed:', err);
    }

    await db
      .update(crossfitUsers)
      .set({ analysisStatus: 'complete', analysisProgress: 100 })
      .where(eq(crossfitUsers.id, userId));
    return { processed: 0, remaining: 0, total: 0 };
  }

  await db
    .update(crossfitUsers)
    .set({ analysisStatus: 'analyzing' })
    .where(eq(crossfitUsers.id, userId));

  let processed = 0;

  // --- Stage 3a: Workout enrichment (one chunk per request) ---
  if (unenrichedWorkouts.length > 0) {
    const chunk = unenrichedWorkouts.slice(0, chunkSize);

    // Heuristic pre-filter for trivial workouts
    const needsLLM: WorkoutForEnrichment[] = [];
    for (const w of chunk) {
      // Only skip truly trivial cases
      if (w.rawDescription.length < 80 && w.isMonthlyChallenge) {
        // Simple monthly challenge — set fields directly
        const categoryId = await getOrCreateCategory('Monthly Challenge');
        await db
          .update(crossfitWorkouts)
          .set({
            workoutType: 'other',
            categoryId,
            isMonthlyChallenge: true,
            aiSummary: 'Monthly challenge entry',
            canonicalTitle: w.rawTitle || 'Monthly Challenge',
            titleSource: w.rawTitle ? 'raw' : 'ai_generated',
          })
          .where(eq(crossfitWorkouts.id, w.id));
        processed++;
      } else {
        needsLLM.push(w);
      }
    }

    // Batch LLM enrichment
    if (needsLLM.length > 0) {
      const batches: WorkoutForEnrichment[][] = [];
      for (let i = 0; i < needsLLM.length; i += BATCH_SIZE) {
        batches.push(needsLLM.slice(i, i + BATCH_SIZE));
      }

      for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
        const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT);
        const results = await Promise.allSettled(
          concurrentBatches.map((batch) => analyzeEnrichmentBatch(client, batch))
        );

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const batch = concurrentBatches[j];

          if (result.status === 'fulfilled') {
            for (let k = 0; k < result.value.length; k++) {
              await storeEnrichmentResult(batch[k].id, result.value[k]);
              processed++;
            }
          } else {
            console.error(`Enrichment batch failed:`, result.reason);
            processed += batch.length; // Count as processed to avoid infinite retries
          }
        }

        // Update progress
        const progress = Math.round((processed / totalWork) * 100);
        await db
          .update(crossfitUsers)
          .set({ analysisProgress: Math.min(progress, 95) })
          .where(eq(crossfitUsers.id, userId));
      }
    }
  }

  // --- Stage 3b: Score analysis (only if no workouts left to enrich) ---
  if (unenrichedWorkouts.length === 0 && unanalyzedScores.length > 0) {
    // Get workout descriptions for each score
    const workoutIds = [...new Set(unanalyzedScores.map((s) => s.workoutId))];
    const workoutDescs = await db
      .select({
        id: crossfitWorkouts.id,
        rawDescription: crossfitWorkouts.rawDescription,
        rawTitle: crossfitWorkouts.rawTitle,
      })
      .from(crossfitWorkouts)
      .where(inArray(crossfitWorkouts.id, workoutIds));

    const descMap = new Map(workoutDescs.map((w) => [w.id, w]));

    const scoresToAnalyze: ScoreForAnalysis[] = unanalyzedScores
      .slice(0, chunkSize)
      .map((s) => ({
        id: s.id,
        workoutId: s.workoutId,
        rawScore: s.rawScore,
        rawDivision: s.rawDivision,
        rawNotes: s.rawNotes,
        workoutDate: s.workoutDate,
        rawDescription: descMap.get(s.workoutId)?.rawDescription || '',
        rawTitle: descMap.get(s.workoutId)?.rawTitle || null,
      }));

    const scoreBatches: ScoreForAnalysis[][] = [];
    for (let i = 0; i < scoresToAnalyze.length; i += BATCH_SIZE) {
      scoreBatches.push(scoresToAnalyze.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < scoreBatches.length; i += MAX_CONCURRENT) {
      const concurrentBatches = scoreBatches.slice(i, i + MAX_CONCURRENT);
      const results = await Promise.allSettled(
        concurrentBatches.map((batch) => analyzeScoreBatch(client, batch))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const batch = concurrentBatches[j];

        if (result.status === 'fulfilled') {
          for (let k = 0; k < result.value.length; k++) {
            await storeScoreResult(batch[k].id, result.value[k]);
            processed++;
          }
        } else {
          console.error(`Score analysis batch failed:`, result.reason);
          // Mark failed scores with error
          for (const score of batch) {
            await db
              .update(crossfitUserScores)
              .set({
                aiAnalysis: JSON.stringify({ source: 'error', error: result.reason?.message || 'Unknown error' }),
              })
              .where(eq(crossfitUserScores.id, score.id));
            processed++;
          }
        }
      }

      const progress = Math.round((processed / totalWork) * 100);
      await db
        .update(crossfitUsers)
        .set({ analysisProgress: Math.min(progress, 95) })
        .where(eq(crossfitUsers.id, userId));
    }
  }

  // Remaining = total work minus what we processed THIS chunk
  // (next call will re-query to find what's left)
  const remaining = totalWork - processed;

  const progress = Math.round(((totalWork - remaining) / totalWork) * 100);
  await db
    .update(crossfitUsers)
    .set({ analysisProgress: Math.min(progress, 95) })
    .where(eq(crossfitUsers.id, userId));

  return { processed, remaining: Math.max(remaining, 0), total: totalWork };
}
