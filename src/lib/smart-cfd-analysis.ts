import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { smartCfdWorkouts, smartCfdMovements, smartCfdUsers } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

// ============================================================
// TYPES
// ============================================================

interface WorkoutForAnalysis {
  id: number;
  rawTitle: string | null;
  rawDescription: string;
  rawScore: string;
  rawDivision: string | null;
  rawNotes: string | null;
}

interface LLMMovementResult {
  name: string;
  prescribed_reps_per_set: number | null;
  prescribed_weight: number | null;
  prescribed_unit?: string | null;
  estimated_actual_weight: number | null;
  estimated_max_weight: number | null;
  estimated_reps_per_set: number | null;
  estimated_reps_completed?: number | null;
  is_limiting_factor: boolean;
}

interface LLMWorkoutResult {
  workout_type: string;
  score_interpretation: {
    score_type: string;
    confidence: string;
    [key: string]: unknown;
  };
  movements: LLMMovementResult[];
  category: string;
  similarity_label: string;
  summary: string;
  notes?: string | null;
}

interface HeuristicResult {
  workoutType: string;
  scoreType: string;
  category: string | null;
  similarityCluster: string | null;
  aiSummary: string;
  confidence: string;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Parse a numeric value from LLM output that may be a number, a string
 * like "65 lb", "95 lbs", "65#", or null/undefined.
 */
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

// ============================================================
// STAGE 1: HEURISTIC PRE-FILTER
// ============================================================

export function heuristicAnalysis(
  desc: string,
  score: string,
  division: string
): HeuristicResult | null {
  const descLower = desc.toLowerCase();
  const scoreTrimmed = score.trim();

  // Only use heuristics for truly simple cases where movement extraction is not valuable.
  // All workouts with real movements should go to the LLM for proper analysis.

  // Rule: Score = "Complete" on a very short/simple description (no real movements to extract)
  if (scoreTrimmed.toLowerCase() === 'complete' && descLower.length < 80) {
    return {
      workoutType: inferWorkoutType(descLower),
      scoreType: 'complete',
      category: null,
      similarityCluster: null,
      aiSummary: `Completed workout${division ? ` (${division})` : ''}`,
      confidence: 'high',
    };
  }

  // Everything else goes to the LLM for full analysis including movement extraction,
  // category assignment, limiting factor detection, and weight estimation.
  return null;
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
// STAGE 2: LLM ANALYSIS
// ============================================================

const SYSTEM_PROMPT = `You are a CrossFit workout analyst. You deeply understand CrossFit programming, scoring conventions, and the PushPress platform.

For each workout, analyze the description, recorded score, and division to determine:
1. What the athlete actually did (interpreting messy scores)
2. Every movement involved and its parameters
3. A training category for the workout
4. A similarity label for finding comparable workouts

CRITICAL SCORING KNOWLEDGE:
- PushPress "For load" workouts often record scores as "total_reps @ sum_of_all_weights" where the weight is the SUM across ALL sets, not the heaviest single set.
  Example: Push press 2-2-2-2-2 scored "10 @ 410" means 5 sets of 2 at varying weights that total 410 (avg ~82 lbs per set, max probably 85-95 lbs).
- Some workouts combine multiple lift maxes into one total (e.g., "1RM BS + SP + DL" scored as "1 @ 420" is three separate 1RMs summed).
- "For time" workouts that hit the time cap get scored as total reps, not a time.
- AMRAP scores are "rounds + reps" format.
- Freeform text scores contain real data (e.g., "35#, 55#, 75#" = set-by-set weights).

Assign each workout ONE primary category from this list (or create a similar one if none fit):

STRENGTH:
- "Heavy Barbell Strength" — squats, deadlifts, presses at high % of 1RM
- "Olympic Lifting" — snatches, cleans, jerks (skill + load)
- "Accessory Strength" — good mornings, lunges, single-arm work, etc.

CONDITIONING:
- "Sprint Metcon" — short, intense (under 10 min), high power output
- "Mid-Length Metcon" — 10-20 minutes, mixed modality
- "Long Chipper / Grinder" — 20+ min, high volume, endurance-biased
- "Engine Builder" — mono-structural (row, run, bike) intervals for cardio

SKILL / GYMNASTICS:
- "Gymnastics Skill" — muscle-ups, handstands, rope climbs as the focus
- "Bodyweight Conditioning" — push-ups, pull-ups, sit-ups as the workout

OTHER:
- "Mixed Modal Test" — benchmark-style or competition-format
- "Active Recovery / Mobility" — low intensity, skill practice

For similarity_label, use lowercase-kebab-case strings that group comparable workouts. Examples:
- "back-squat-heavy-singles", "short-amrap-barbell-gymnastics", "long-chipper-high-volume"

Also identify benchmark workouts when possible (Fran, Murph, Grace, etc.) and mention them in the summary.

IMPORTANT — MOVEMENT FIELD REQUIREMENTS:
- For EVERY weighted movement, you MUST provide "estimated_max_weight" (your best estimate of the heaviest single-rep weight used for that movement IN THIS SPECIFIC WORKOUT — not an extrapolated 1RM). For "for_load" workouts with sum-of-weights scoring, divide intelligently — don't leave this null.
- For EVERY weighted movement, provide "estimated_actual_weight" (the typical working weight for that movement in the workout).
- For EVERY movement, you MUST provide "estimated_reps_per_set" — the number of reps per set for that movement. This is critical for determining whether a session was heavy low-rep work (1-3 reps = true strength indicator) vs. lighter high-rep metcon work. For example, a 5x1 deadlift day at 225 lbs is a much better indicator of true max than 21-15-9 deadlifts at 135 lbs.
- For scaled workouts, you MUST assess "is_limiting_factor" for each movement. Set it to true for the movement(s) that most likely caused the athlete to scale. At least one movement should be marked true in a scaled workout. Common limiting factors: muscle-ups, handstand push-ups, heavy barbell weights, rope climbs, pistols.
- IMPORTANT: If the athlete provided personal notes, USE THEM to determine scaling attribution. Notes often explain exactly what was scaled (e.g., "used 95# instead of 135#" or "did ring rows instead of pull-ups" or "ran instead of biked"). When notes clarify what was scaled, mark ONLY those specific movements as limiting factors — don't guess.
- Use SINGULAR, standard CrossFit movement names: "Back Squat" (not "Back Squats" or "Barbell Back Squat"), "Push Press" (not "Push Presses"), "Deadlift" (not "Deadlifts"), "Clean & Jerk", "Power Snatch", etc.

MONTHLY CHALLENGES / NON-WORKOUT ENTRIES:
- Some entries are NOT actual workouts but monthly gym challenges, nutrition goals, or daily habit trackers. Examples:
  - "Complete 5 minutes of Core every day in March"
  - "Drink 100 oz of water per day"
  - Nutrition challenges (e.g., "Track your macros daily")
  - Push-up challenges, mobility challenges, etc.
- For these entries, set category to "Monthly Challenge" and workout_type to "other".
- The summary should describe the challenge, e.g., "Monthly core challenge — 5 min daily core work in March"
- Use similarity_label "monthly-challenge" for these entries.
- Do NOT extract movements from monthly challenges unless they specify a real workout structure.

Respond ONLY with a JSON array matching the input order. No markdown, no explanation, just the JSON array.`;

const BATCH_SIZE = 15;
const MAX_CONCURRENT = 5;

function buildWorkoutPrompt(workouts: WorkoutForAnalysis[]): string {
  return workouts
    .map(
      (w, i) =>
        `[${i + 1}] Title: "${w.rawTitle || ''}"
    Description: "${w.rawDescription.replace(/"/g, '\\"')}"
    Score: "${w.rawScore}"
    Division: "${w.rawDivision || 'Unknown'}"${w.rawNotes ? `\n    Personal Notes: "${w.rawNotes.replace(/"/g, '\\"')}"` : ''}`
    )
    .join('\n\n');
}

async function analyzeBatch(
  client: Anthropic,
  workouts: WorkoutForAnalysis[]
): Promise<LLMWorkoutResult[]> {
  const userMessage = buildWorkoutPrompt(workouts);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract JSON from response (handle potential markdown wrapping)
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // Fix common LLM JSON issues: trailing commas before ] or }
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  let results: LLMWorkoutResult[];
  try {
    results = JSON.parse(jsonStr);
  } catch (e) {
    // If JSON is truncated (hit max_tokens), try to salvage what we can
    // Find the last complete object in the array
    const lastCompleteObj = jsonStr.lastIndexOf('},');
    if (lastCompleteObj > 0) {
      const salvaged = jsonStr.substring(0, lastCompleteObj + 1) + ']';
      results = JSON.parse(salvaged);
    } else {
      throw e;
    }
  }

  if (results.length !== workouts.length) {
    // If we got a partial result (e.g. truncated), just use what we have
    // rather than failing the entire batch
    if (results.length > 0 && results.length < workouts.length) {
      console.warn(
        `LLM returned ${results.length} of ${workouts.length} results — processing partial batch`
      );
      return results;
    }
    throw new Error(
      `LLM returned ${results.length} results for ${workouts.length} workouts`
    );
  }

  return results;
}

// ============================================================
// STAGE 3: STORE RESULTS
// ============================================================

async function storeHeuristicResult(
  workoutId: number,
  userId: number,
  result: HeuristicResult
) {
  await db
    .update(smartCfdWorkouts)
    .set({
      workoutType: result.workoutType,
      scoreType: result.scoreType,
      category: result.category,
      similarityCluster: result.similarityCluster,
      aiSummary: result.aiSummary,
      aiAnalysis: JSON.stringify({ source: 'heuristic', confidence: result.confidence }),
    })
    .where(eq(smartCfdWorkouts.id, workoutId));
}

async function storeLLMResult(
  workoutId: number,
  userId: number,
  result: LLMWorkoutResult
) {
  // Update workout record
  await db
    .update(smartCfdWorkouts)
    .set({
      workoutType: result.workout_type,
      scoreType: result.score_interpretation?.score_type || 'unknown',
      category: result.category,
      similarityCluster: result.similarity_label,
      aiSummary: result.summary,
      aiAnalysis: JSON.stringify(result),
    })
    .where(eq(smartCfdWorkouts.id, workoutId));

  // Insert movement records (filter out any with missing name)
  const validMovements = (result.movements || []).filter(
    (m) => m.name && typeof m.name === 'string' && m.name.trim() !== ''
  );
  if (validMovements.length > 0) {
    await db.insert(smartCfdMovements).values(
      validMovements.map((m) => ({
        workoutId,
        userId,
        movementName: m.name,
        prescribedReps: parseInteger(m.prescribed_reps_per_set),
        prescribedWeight: parseNumeric(m.prescribed_weight),
        prescribedUnit: m.prescribed_unit || (m.prescribed_weight ? 'lbs' : null),
        estimatedActualWeight: parseNumeric(m.estimated_actual_weight),
        estimatedMaxWeight: parseNumeric(m.estimated_max_weight),
        estimatedRepsCompleted: parseInteger(m.estimated_reps_per_set) ?? parseInteger(m.estimated_reps_completed),
        isLimitingFactor: m.is_limiting_factor ?? false,
        confidence: result.score_interpretation?.confidence || 'medium',
      }))
    );
  }
}

// ============================================================
// ORCHESTRATOR: Process a chunk of workouts
// ============================================================

/**
 * Process a chunk of un-analyzed workouts for a user.
 * Returns { processed, remaining } so the client knows whether to call again.
 */
export async function processAnalysisChunk(
  userId: number,
  chunkSize: number = 60 // ~4 LLM batches of 15
): Promise<{ processed: number; remaining: number; total: number }> {
  // Load un-analyzed workouts (no aiAnalysis yet)
  const unanalyzed = await db
    .select()
    .from(smartCfdWorkouts)
    .where(
      and(eq(smartCfdWorkouts.userId, userId), isNull(smartCfdWorkouts.aiAnalysis))
    );

  const total = unanalyzed.length;
  if (total === 0) {
    await db
      .update(smartCfdUsers)
      .set({ analysisStatus: 'complete', analysisProgress: 100 })
      .where(eq(smartCfdUsers.id, userId));
    return { processed: 0, remaining: 0, total: 0 };
  }

  // Set status to analyzing
  await db
    .update(smartCfdUsers)
    .set({ analysisStatus: 'analyzing' })
    .where(eq(smartCfdUsers.id, userId));

  // Take a chunk
  const chunk = unanalyzed.slice(0, chunkSize);
  let processed = 0;

  // Stage 1: Heuristic pre-filter
  const needsLLM: WorkoutForAnalysis[] = [];

  for (const workout of chunk) {
    const result = heuristicAnalysis(
      workout.rawDescription,
      workout.rawScore,
      workout.rawDivision || ''
    );

    if (result) {
      await storeHeuristicResult(workout.id, userId, result);
      processed++;
    } else {
      needsLLM.push({
        id: workout.id,
        rawTitle: workout.rawTitle,
        rawDescription: workout.rawDescription,
        rawScore: workout.rawScore,
        rawDivision: workout.rawDivision,
        rawNotes: workout.rawNotes,
      });
    }
  }

  // Stage 2: Batched LLM analysis
  if (needsLLM.length > 0) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const client = new Anthropic({ apiKey });

    // Split into batches
    const batches: WorkoutForAnalysis[][] = [];
    for (let i = 0; i < needsLLM.length; i += BATCH_SIZE) {
      batches.push(needsLLM.slice(i, i + BATCH_SIZE));
    }

    // Process batches with limited concurrency
    for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
      const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT);

      const results = await Promise.allSettled(
        concurrentBatches.map((batch) => analyzeBatch(client, batch))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const batch = concurrentBatches[j];

        if (result.status === 'fulfilled') {
          for (let k = 0; k < result.value.length; k++) {
            await storeLLMResult(batch[k].id, userId, result.value[k]);
            processed++;
          }
        } else {
          // Log error but continue with other batches
          console.error(`Batch ${i + j} failed:`, result.reason);
          // Mark failed workouts with error state so they can be retried
          for (const workout of batch) {
            await db
              .update(smartCfdWorkouts)
              .set({
                aiAnalysis: JSON.stringify({
                  source: 'error',
                  error: result.reason?.message || 'Unknown error',
                }),
              })
              .where(eq(smartCfdWorkouts.id, workout.id));
            processed++;
          }
        }
      }

      // Update progress
      const totalToProcess = unanalyzed.length;
      const overallProcessed = totalToProcess - total + processed;
      const progress = Math.round((overallProcessed / totalToProcess) * 100);
      await db
        .update(smartCfdUsers)
        .set({ analysisProgress: Math.min(progress, 99) })
        .where(eq(smartCfdUsers.id, userId));
    }
  }

  const remaining = total - processed;

  // Update final status
  if (remaining <= 0) {
    await db
      .update(smartCfdUsers)
      .set({ analysisStatus: 'complete', analysisProgress: 100 })
      .where(eq(smartCfdUsers.id, userId));
  } else {
    // More chunks to process
    const progress = Math.round(((total - remaining) / total) * 100);
    await db
      .update(smartCfdUsers)
      .set({ analysisProgress: progress })
      .where(eq(smartCfdUsers.id, userId));
  }

  return { processed, remaining: Math.max(remaining, 0), total };
}
