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
import { eq, and, isNull, inArray } from 'drizzle-orm';

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

function inferScoreType(rawScore: string): string {
  const s = rawScore.trim();
  // Time format: MM:SS or H:MM:SS
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return 'time';
  // Rounds+reps: "R + N" or "R+N"
  if (/^\d+\s*\+\s*\d+$/.test(s)) return 'rounds_reps';
  // Weight: "N @ W"
  if (/^\d+\s*@\s*[\d.]+$/.test(s)) return 'max_weight';
  // Pure number (reps, calories, distance)
  if (/^\d+$/.test(s)) return 'reps';
  // "Complete" or "Completed"
  if (/^complet/i.test(s)) return 'complete';
  return 'unknown';
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

// Deterministic synonym map — resolves before DB lookup
const MOVEMENT_SYNONYMS: Record<string, string> = {
  // Muscle-ups: unqualified = ring
  'muscle-up': 'Ring Muscle-Up',
  'muscle-ups': 'Ring Muscle-Up',
  'muscle up': 'Ring Muscle-Up',
  'muscle ups': 'Ring Muscle-Up',
  'ring muscle-up': 'Ring Muscle-Up',
  'ring muscle-ups': 'Ring Muscle-Up',
  'ring muscle up': 'Ring Muscle-Up',
  'ring muscle ups': 'Ring Muscle-Up',
  'bar muscle-up': 'Bar Muscle-Up',
  'bar muscle-ups': 'Bar Muscle-Up',
  'bar muscle up': 'Bar Muscle-Up',
  'bar muscle ups': 'Bar Muscle-Up',
  'bmu': 'Bar Muscle-Up',

  // Double-unders
  'double-unders': 'Double-Under',
  'double under': 'Double-Under',
  'double unders': 'Double-Under',
  'dubs': 'Double-Under',
  'single-unders': 'Single-Under',
  'single under': 'Single-Under',
  'single unders': 'Single-Under',

  // Pull-ups
  'pull-ups': 'Pull-Up',
  'pullups': 'Pull-Up',
  'pullup': 'Pull-Up',
  'pull ups': 'Pull-Up',
  'chest-to-bar pull-up': 'Chest-to-Bar Pull-Up',
  'chest-to-bar pull-ups': 'Chest-to-Bar Pull-Up',
  'chest to bar pull-up': 'Chest-to-Bar Pull-Up',
  'chest to bar pull-ups': 'Chest-to-Bar Pull-Up',
  'c2b pull-up': 'Chest-to-Bar Pull-Up',
  'c2b pull-ups': 'Chest-to-Bar Pull-Up',
  'c2b': 'Chest-to-Bar Pull-Up',

  // Toes-to-bar
  'toes-to-bars': 'Toes-to-Bar',
  'toes to bars': 'Toes-to-Bar',
  'toes to bar': 'Toes-to-Bar',
  'toes-to-bar': 'Toes-to-Bar',
  't2b': 'Toes-to-Bar',
  'knees-to-elbow': 'Knee-to-Elbow',
  'knees-to-elbows': 'Knee-to-Elbow',
  'knees to elbows': 'Knee-to-Elbow',
  'k2e': 'Knee-to-Elbow',

  // Box movements
  'box jumps': 'Box Jump',
  'box jump overs': 'Box Jump-Over',
  'box jump-overs': 'Box Jump-Over',
  'box step-ups': 'Box Step-Up',
  'box step ups': 'Box Step-Up',

  // Wall balls
  'wall balls': 'Wall Ball',
  'wall ball shots': 'Wall Ball',
  'wall ball shot': 'Wall Ball',

  // Burpees
  'burpees': 'Burpee',
  'bar-facing burpees': 'Bar-Facing Burpee',
  'bar facing burpees': 'Bar-Facing Burpee',
  'bar-facing burpee': 'Bar-Facing Burpee',
  'burpee box jump-overs': 'Burpee Box Jump-Over',
  'burpee box jump overs': 'Burpee Box Jump-Over',

  // Sit-ups
  'sit-ups': 'Sit-Up',
  'situps': 'Sit-Up',
  'situp': 'Sit-Up',
  'ghd sit-ups': 'GHD Sit-Up',
  'ghd situps': 'GHD Sit-Up',
  'ghd sit-up': 'GHD Sit-Up',
  'ghd situp': 'GHD Sit-Up',

  // Handstand push-ups
  'handstand push-ups': 'Handstand Push-Up',
  'handstand pushups': 'Handstand Push-Up',
  'handstand push-up': 'Handstand Push-Up',
  'handstand pushup': 'Handstand Push-Up',
  'hspu': 'Handstand Push-Up',
  'strict handstand push-up': 'Strict Handstand Push-Up',
  'strict handstand push-ups': 'Strict Handstand Push-Up',
  'strict hspu': 'Strict Handstand Push-Up',

  // Presses
  'press': 'Strict Press',
  'shoulder press': 'Strict Press',
  'strict press': 'Strict Press',
  'push press': 'Push Press',
  'push jerk': 'Push Jerk',
  'jerk': 'Push Jerk',
  'split jerk': 'Split Jerk',

  // Cleans — bare "clean" stays generic; prompt handles disambiguation
  'power clean': 'Power Clean',
  'power cleans': 'Power Clean',
  'squat clean': 'Squat Clean',
  'squat cleans': 'Squat Clean',
  'hang clean': 'Hang Power Clean',
  'hang cleans': 'Hang Power Clean',
  'hang power clean': 'Hang Power Clean',
  'hang power cleans': 'Hang Power Clean',
  'hang squat clean': 'Hang Squat Clean',
  'hang squat cleans': 'Hang Squat Clean',
  'clean and jerk': 'Clean and Jerk',
  'clean & jerk': 'Clean and Jerk',

  // Snatches
  'power snatch': 'Power Snatch',
  'power snatches': 'Power Snatch',
  'squat snatch': 'Squat Snatch',
  'squat snatches': 'Squat Snatch',
  'hang snatch': 'Hang Power Snatch',
  'hang snatches': 'Hang Power Snatch',
  'hang power snatch': 'Hang Power Snatch',
  'hang power snatches': 'Hang Power Snatch',

  // Squats
  'back squats': 'Back Squat',
  'front squats': 'Front Squat',
  'overhead squats': 'Overhead Squat',
  'air squats': 'Air Squat',
  'goblet squats': 'Goblet Squat',
  'pistols': 'Pistol Squat',
  'pistol squats': 'Pistol Squat',
  'pistol': 'Pistol Squat',

  // Deadlifts
  'deadlifts': 'Deadlift',
  'clean grip deadlift': 'Clean-Grip Deadlift',
  'clean-grip deadlift': 'Clean-Grip Deadlift',
  'clean deadlift': 'Clean-Grip Deadlift',
  'sumo deadlift high pull': 'Sumo Deadlift High Pull',
  'sumo deadlift high pulls': 'Sumo Deadlift High Pull',
  'sdhp': 'Sumo Deadlift High Pull',
  'romanian deadlift': 'Romanian Deadlift',
  'romanian deadlifts': 'Romanian Deadlift',
  'rdl': 'Romanian Deadlift',

  // Thrusters
  'thrusters': 'Thruster',

  // Carries
  'farmer carry': 'Farmers Carry',
  "farmer's carry": 'Farmers Carry',
  'farmers carry': 'Farmers Carry',
  'farmers walk': 'Farmers Carry',
  'farmer walk': 'Farmers Carry',
  'front rack carry': 'Front Rack Carry',
  'overhead carry': 'Overhead Carry',

  // Rope
  'rope climbs': 'Rope Climb',
  'rope climb': 'Rope Climb',

  // Rowing / cardio
  'row': 'Row',
  'rowing': 'Row',
  'ski erg': 'Ski Erg',
  'assault bike': 'Assault Bike',
  'echo bike': 'Echo Bike',
  'bike erg': 'Bike Erg',

  // Kettlebell
  'kb swing': 'Kettlebell Swing',
  'kb swings': 'Kettlebell Swing',
  'kettlebell swings': 'Kettlebell Swing',
  'russian kb swing': 'Russian Kettlebell Swing',
  'american kb swing': 'American Kettlebell Swing',
  'kb snatch': 'Kettlebell Snatch',
  'kb snatches': 'Kettlebell Snatch',

  // Dumbbell
  'db snatch': 'Dumbbell Snatch',
  'db snatches': 'Dumbbell Snatch',
  'dumbbell snatch': 'Dumbbell Snatch',
  'dumbbell snatches': 'Dumbbell Snatch',
  'db clean': 'Dumbbell Clean',
  'db cleans': 'Dumbbell Clean',
  'db hang clean': 'Dumbbell Hang Clean',
  'db hang cleans': 'Dumbbell Hang Clean',
  'db hang squat clean': 'Dumbbell Hang Squat Clean',
  'db hang squat cleans': 'Dumbbell Hang Squat Clean',
  'db thruster': 'Dumbbell Thruster',
  'db thrusters': 'Dumbbell Thruster',
  'dumbbell thruster': 'Dumbbell Thruster',
  'dumbbell thrusters': 'Dumbbell Thruster',
  'db push press': 'Dumbbell Push Press',
  'db push presses': 'Dumbbell Push Press',
  'dumbbell push press': 'Dumbbell Push Press',
  'dumbbell push presses': 'Dumbbell Push Press',

  // Lunges
  'lunges': 'Lunge',
  'walking lunges': 'Walking Lunge',
  'walking lunge': 'Walking Lunge',
  'overhead lunges': 'Overhead Lunge',
  'overhead lunge': 'Overhead Lunge',
  'front rack lunges': 'Front Rack Lunge',
  'front rack lunge': 'Front Rack Lunge',
};

// Movements where a 1RM estimate is not meaningful
const NON_1RM_MOVEMENTS = new Set([
  'farmers carry', 'front rack carry', 'overhead carry', 'suitcase carry',
  'run', 'row', 'bike', 'ski erg', 'assault bike', 'echo bike', 'bike erg',
  'wall ball', 'burpee', 'bar-facing burpee', 'burpee box jump-over',
  'box jump', 'box jump-over', 'box step-up',
  'double-under', 'single-under',
  'sit-up', 'ghd sit-up', 'toes-to-bar', 'knee-to-elbow',
  'plank', 'l-sit', 'hollow hold', 'handstand hold',
  'rope climb', 'sled push', 'sled pull', 'battle rope',
  'air squat', 'pistol squat',
  'pull-up', 'chest-to-bar pull-up', 'ring muscle-up', 'bar muscle-up',
  'handstand push-up', 'strict handstand push-up',
  'handstand walk', 'muscle-up',
  'kettlebell swing', 'russian kettlebell swing', 'american kettlebell swing',
]);

function resolveMovementName(name: string): string {
  const key = name.toLowerCase().trim();
  return MOVEMENT_SYNONYMS[key] || name.trim();
}

function is1rmApplicable(name: string): boolean {
  return !NON_1RM_MOVEMENTS.has(name.toLowerCase().trim());
}

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
  // Resolve synonyms before anything else
  const canonicalName = resolveMovementName(name);
  const map = await getMovementMap();
  const key = canonicalName.toLowerCase();
  if (map.has(key)) return map.get(key)!;

  const is1rm = is1rmApplicable(canonicalName);

  try {
    const [inserted] = await db
      .insert(crossfitMovements)
      .values({
        canonicalName,
        movementType: movementType || null,
        isWeighted: isWeighted ?? false,
        is1rmApplicable: is1rm,
      })
      .returning({ id: crossfitMovements.id });
    map.set(key, inserted.id);
    return inserted.id;
  } catch {
    // Unique constraint violation
    const existing = await db
      .select({ id: crossfitMovements.id })
      .from(crossfitMovements)
      .where(eq(crossfitMovements.canonicalName, canonicalName))
      .limit(1);
    if (existing.length > 0) {
      map.set(key, existing[0].id);
      return existing[0].id;
    }
    throw new Error(`Failed to create or find movement: ${canonicalName}`);
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

MOVEMENT NAMING RULES (CRITICAL — follow exactly):
- Always use SINGULAR form: "Pull-Up" not "Pull-Ups", "Double-Under" not "Double-Unders", "Thruster" not "Thrusters"
- Always QUALIFY lift variants — never use bare movement names:
  - "Clean" alone is ambiguous. Use "Power Clean", "Squat Clean", or "Hang Power Clean" based on context.
    If description says just "clean" with heavy weight/low reps, assume "Squat Clean".
    If in a metcon with moderate weight, assume "Power Clean".
  - "Snatch" alone is ambiguous. Use "Power Snatch" or "Squat Snatch". Same heuristic as cleans.
  - "Press" → "Strict Press" unless context says "push press".
  - "Jerk" → "Push Jerk" unless "split jerk" is specified.
  - "Muscle-Up" alone → "Ring Muscle-Up". Only use "Bar Muscle-Up" if description explicitly says "bar muscle-up" or "BMU".
- Equipment prefix rules:
  - "DB" in description → prefix with "Dumbbell" (e.g., "Dumbbell Hang Squat Clean", "Dumbbell Snatch")
  - "KB" in description → prefix with "Kettlebell" (e.g., "Kettlebell Swing", "Kettlebell Snatch")
  - No prefix → assume barbell for standard lifts (clean, snatch, press, squat, deadlift, thruster)
- Carries: always specify type — "Farmers Carry", "Front Rack Carry", "Overhead Carry"
- You MUST map every movement to one of the canonical names below. If a movement does not match any name, use the closest match or declare a new name with justification.

CANONICAL MOVEMENT LIST (use these exact names):
BARBELL — Back Squat, Front Squat, Overhead Squat, Deadlift, Romanian Deadlift, Clean-Grip Deadlift, Sumo Deadlift High Pull, Strict Press, Push Press, Push Jerk, Split Jerk, Bench Press, Power Clean, Squat Clean, Hang Power Clean, Hang Squat Clean, Clean and Jerk, Power Snatch, Squat Snatch, Hang Power Snatch, Hang Squat Snatch, Thruster
DUMBBELL — Dumbbell Snatch, Dumbbell Clean, Dumbbell Hang Clean, Dumbbell Hang Squat Clean, Dumbbell Thruster, Dumbbell Push Press
KETTLEBELL — Kettlebell Swing, Russian Kettlebell Swing, American Kettlebell Swing, Kettlebell Snatch
GYMNASTICS — Pull-Up, Chest-to-Bar Pull-Up, Ring Muscle-Up, Bar Muscle-Up, Toes-to-Bar, Knee-to-Elbow, Handstand Push-Up, Strict Handstand Push-Up, Handstand Walk, Rope Climb, Ring Dip, Strict Ring Dip, Pistol Squat
BODYWEIGHT — Burpee, Bar-Facing Burpee, Burpee Box Jump-Over, Box Jump, Box Jump-Over, Box Step-Up, Sit-Up, GHD Sit-Up, Air Squat, Lunge, Walking Lunge, Overhead Lunge, Front Rack Lunge, Push-Up, Double-Under, Single-Under, Wall Ball
MONOSTRUCTURAL — Row, Ski Erg, Assault Bike, Echo Bike, Bike Erg, Run
CARRIES — Farmers Carry, Front Rack Carry, Overhead Carry, Suitcase Carry

For similarity_label, use lowercase-kebab-case strings grouping comparable workouts.

Respond ONLY with a JSON array matching the input order. No markdown, no explanation.`;

const ENRICHMENT_BATCH_SIZE = 12;
const SCORE_BATCH_SIZE = 10;
const MAX_CONCURRENT = 2;
const HAIKU_BATCH_SIZE = 20;

// ============================================================
// HAIKU PRE-CLASSIFICATION (cheap tier for simple workouts)
// ============================================================

const HAIKU_CLASSIFY_PROMPT = `Classify each CrossFit workout. For each, return:
- needs_deep_analysis: true if the scoring is ambiguous, has complex rep schemes with "for load" scoring, unusual movement combinations, or is hard to interpret. false if it's a straightforward metcon, named benchmark, simple strength session, or monthly challenge.
- workout_type: for_time | amrap | for_load | emom | for_reps | tabata | accessory | other
- is_monthly_challenge: true/false
- basic_movements: array of movement names extracted from the description (use singular, qualified names)

Respond ONLY with a JSON array matching input order.`;

interface HaikuClassification {
  needs_deep_analysis: boolean;
  workout_type: string;
  is_monthly_challenge: boolean;
  basic_movements: string[];
}

async function classifyWorkoutsBatch(
  client: Anthropic,
  workouts: WorkoutForEnrichment[]
): Promise<HaikuClassification[]> {
  const prompt = workouts
    .map(
      (w, i) =>
        `[${i + 1}] Title: "${w.rawTitle || ''}"
    Description: "${w.rawDescription.replace(/"/g, '\\"').substring(0, 300)}"
    Monthly Challenge Flag: ${w.isMonthlyChallenge}`
    )
    .join('\n\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: HAIKU_CLASSIFY_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseJSONResponse(text, workouts.length);
}

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

function buildScoreSystemPrompt(gender?: string | null): string {
  const genderGuidance = gender ? `
PRESCRIBED WEIGHT CONVENTION (CRITICAL):
CrossFit workouts use "female/male" notation for weights and heights.
Example: "(95/135 lb)" means 95 lbs for women, 135 lbs for men.
Example: "(20/24 in)" means 20-inch box for women, 24-inch for men.

This user is: ${gender}
- For Rx workouts: use the ${gender} prescribed weight as estimated_actual_weight
  (${gender === 'female' ? 'FIRST number before the slash' : 'SECOND number after the slash'})
- For Scaled workouts: DO NOT assume the user used the prescribed weight.
  The user scaled some aspect of the workout but we don't know what.
  Set estimated_actual_weight = null for scaled workouts unless the score
  explicitly includes weight information (e.g., "1 @ 85").` : '';

  return `You are a CrossFit workout analyst. For each user score, interpret the score and extract per-movement performance data.
${genderGuidance}

CRITICAL SCORING KNOWLEDGE:
- PushPress "For load" workouts often record scores as "total_reps @ sum_of_all_weights" where the weight is the SUM across ALL sets.
  Example: Push press 2-2-2-2-2 scored "10 @ 410" means 5 sets of 2 at varying weights totaling 410 (avg ~82 lbs/set).
- Some workouts combine multiple lift maxes into one total.
- "For time" workouts that hit the time cap get scored as total reps.
- AMRAP scores are "rounds + reps" format.

FOR LOAD / STRENGTH WORKOUTS — 1RM EXTRACTION (CRITICAL):
When the rep scheme includes singles (e.g., 3-2-2-1-1-1, 5-3-1, 1-1-1-1-1):
- The score typically represents the HEAVIEST weight lifted (the 1RM or near-1RM)
- If score format is "X reps @ Y lbs" and the rep scheme ends with singles (building to heavy):
  - estimated_max_weight = Y (the actual heaviest single), NOT an average
  - Example: Back squat 3-2-2-1-1-1, score "10 @ 165" → estimated_max_weight = 165 (that's the heavy single)
- If the rep scheme is all equal sets (2-2-2-2-2, 5-5-5) and score looks like a sum:
  - score_type = "sum_of_weights", divide total by number of sets for average
  - estimated_max_weight = average per set (or slightly above for ascending sets)
- KEY SIGNAL: rep schemes ending in 1s (3-2-2-1-1-1, 5-3-1) mean "building to heavy single" — the score weight IS the max

SPECIAL CASE — All-singles schemes (1-1-1-1-1):
When score is "N @ W" and N equals the number of singles, W is OFTEN the SUM
of all singles (PushPress export format), NOT the weight per single.
Divide W by N to get per-single weight. Verify: if W/N is consistent with
the athlete's other performances for this movement, use W/N.

For each score, provide:
- score_type: time | rounds_reps | reps | max_weight | sum_of_weights | combined_total | reps_at_fixed_weight | distance | calories | complete | unknown
- confidence: high | medium | low
- Any relevant fields: total_weight_recorded, estimated_sets, estimated_max_weight, etc.

For each movement in the workout, provide per-movement performance:
- name: Use the SAME canonical movement name conventions as the enrichment stage. Always singular, always qualified (e.g., "Power Clean" not "Clean", "Ring Muscle-Up" not "Muscle-Up").
- estimated_actual_weight: typical working weight across sets
- estimated_max_weight: the HEAVIEST single-rep weight in this workout. For strength sessions with singles, this is the actual 1RM weight, not an average.
- estimated_reps_completed: total reps completed across all sets
- is_limiting_factor: for scaled workouts only
- If personal notes explain scaling, USE THEM

Respond ONLY with a JSON array matching input order. Each item:
{
  "score_interpretation": { "score_type": "...", "confidence": "...", ... },
  "movement_performance": [{ "name": "...", "estimated_actual_weight": ..., "estimated_max_weight": ..., "estimated_reps_completed": ..., "is_limiting_factor": false }],
  "summary": "brief one-line summary"
}`;
}

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
  scores: ScoreForAnalysis[],
  gender?: string | null
): Promise<ScoreLLMResult[]> {
  const userMessage = buildScorePrompt(scores);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: buildScoreSystemPrompt(gender),
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
// DETERMINISTIC SCORE EXTRACTION (overrides LLM when possible)
// ============================================================

/**
 * Parse rep scheme from description (e.g., "3-2-2-1-1-1" or "5-5-5")
 */
function parseRepScheme(description: string): number[] | null {
  // Match patterns like "3-2-2-1-1-1", "5-5-5-5-5", "1-1-1-1-1"
  const match = description.match(/\b(\d+(?:-\d+){2,})\b/);
  if (!match) return null;
  return match[1].split('-').map(Number);
}

/**
 * Determine if a rep scheme ends in singles (building to heavy)
 * e.g., 3-2-2-1-1-1 or 5-3-1
 */
function endsInSingles(scheme: number[]): boolean {
  if (scheme.length < 2) return false;
  const lastTwo = scheme.slice(-2);
  return lastTwo.every((r) => r === 1);
}

/**
 * Determine if a rep scheme is all equal sets (e.g., 5-5-5, 2-2-2-2-2)
 */
function isUniformScheme(scheme: number[]): boolean {
  if (scheme.length < 2) return false;
  return scheme.every((r) => r === scheme[0]);
}

/**
 * Determine if a rep scheme is all singles (e.g., 1-1-1-1-1)
 */
function isAllSingles(scheme: number[]): boolean {
  return scheme.length >= 2 && scheme.every((r) => r === 1);
}

/**
 * Attempt deterministic score extraction for "for load" workouts.
 * Returns corrected estimated_max_weight if deterministic parsing is possible.
 */
function deterministicScoreExtraction(
  rawScore: string,
  rawDescription: string,
): { maxWeight: number; scoreType: string; confidence: string } | null {
  // Match "N @ W" pattern
  const scoreMatch = rawScore.trim().match(/^(\d+)\s*@\s*([\d.]+)$/);
  if (!scoreMatch) return null;

  const totalReps = parseInt(scoreMatch[1]);
  const weight = parseFloat(scoreMatch[2]);
  if (isNaN(totalReps) || isNaN(weight) || weight <= 0) return null;

  const scheme = parseRepScheme(rawDescription);
  if (!scheme) return null;

  const totalSchemeReps = scheme.reduce((a, b) => a + b, 0);
  const numSets = scheme.length;

  // Case 1: Scheme ends in singles (3-2-2-1-1-1, 5-3-1)
  // Weight IS the max (the heavy single)
  if (endsInSingles(scheme) && !isAllSingles(scheme)) {
    return { maxWeight: weight, scoreType: 'max_weight', confidence: 'high' };
  }

  // Case 2: All singles (1-1-1-1-1)
  // "N @ W" where N = number of singles → W is likely the SUM
  if (isAllSingles(scheme) && totalReps === numSets) {
    const perSingle = weight / numSets;
    return { maxWeight: perSingle, scoreType: 'sum_of_weights', confidence: 'high' };
  }

  // Case 3: Uniform rep scheme (5-5-5, 2-2-2-2-2, 3-3-3-3-3)
  // "N @ W" where N = total reps → W is likely the SUM across all sets
  if (isUniformScheme(scheme) && totalReps === totalSchemeReps) {
    const perSet = weight / numSets;
    return { maxWeight: perSet, scoreType: 'sum_of_weights', confidence: 'high' };
  }

  // Case 4: Uniform rep scheme but N doesn't match exactly
  // Still likely a sum if weight seems too high for the movement
  if (isUniformScheme(scheme) && weight > 200) {
    const perSet = weight / numSets;
    return { maxWeight: perSet, scoreType: 'sum_of_weights', confidence: 'medium' };
  }

  return null;
}

// ============================================================
// WEIGHT SANITY BOUNDS PER MOVEMENT CATEGORY
// ============================================================

const WEIGHT_CEILINGS: Record<string, number> = {
  // Olympic lifts
  'Snatch': 300, 'Power Snatch': 300, 'Squat Snatch': 300,
  'Hang Power Snatch': 300, 'Hang Squat Snatch': 300,
  'Clean and Jerk': 400,
  // Jerks
  'Push Jerk': 300, 'Split Jerk': 350,
  // Cleans
  'Power Clean': 350, 'Squat Clean': 400,
  'Hang Power Clean': 350, 'Hang Squat Clean': 350,
  // Pressing
  'Strict Press': 250, 'Push Press': 300,
  'Bench Press': 350,
  // Powerlifts
  'Back Squat': 500, 'Front Squat': 400, 'Overhead Squat': 350,
  'Deadlift': 600,
};

const DEFAULT_WEIGHT_CEILING = 500;

function getWeightCeiling(movementName: string): number {
  return WEIGHT_CEILINGS[movementName] || DEFAULT_WEIGHT_CEILING;
}

/**
 * Apply weight sanity bounds. If a weight exceeds the ceiling for a movement,
 * it's likely a sum-of-weights — try to divide by likely number of sets.
 */
function sanitizeWeight(
  weight: number | null,
  movementName: string,
  rawDescription: string,
): number | null {
  if (weight === null || weight <= 0) return weight;

  const ceiling = getWeightCeiling(movementName);
  if (weight <= ceiling) return weight;

  // Likely a sum-of-weights — try to divide by number of sets
  const scheme = parseRepScheme(rawDescription);
  if (scheme) {
    const numSets = scheme.length;
    const corrected = weight / numSets;
    if (corrected <= ceiling) return corrected;
  }

  // If still too high, flag as unreliable
  return null;
}

// ============================================================

async function storeScoreResult(
  scoreId: number,
  result: ScoreLLMResult,
  rawScore?: string,
  rawDescription?: string
): Promise<void> {
  // Apply deterministic score extraction override if possible
  let scoreType = result.score_interpretation?.score_type || 'unknown';
  let deterministicMax: number | null = null;

  if (rawScore && rawDescription) {
    const deterministic = deterministicScoreExtraction(rawScore, rawDescription);
    if (deterministic && deterministic.confidence === 'high') {
      scoreType = deterministic.scoreType;
      deterministicMax = deterministic.maxWeight;
    }
  }

  await db
    .update(crossfitUserScores)
    .set({
      scoreType,
      aiScoreInterpretation: JSON.stringify({
        ...result.score_interpretation,
        ...(deterministicMax !== null ? {
          deterministic_override: true,
          deterministic_max_weight: deterministicMax,
        } : {}),
      }),
      aiAnalysis: JSON.stringify(result),
    })
    .where(eq(crossfitUserScores.id, scoreId));

  // Insert movement performance records
  const validPerf = (result.movement_performance || []).filter(
    (m) => m.name && typeof m.name === 'string' && m.name.trim() !== ''
  );

  for (const perf of validPerf) {
    const movementMap = await getMovementMap();
    const resolvedName = resolveMovementName(perf.name);
    const movementId = movementMap.get(resolvedName.toLowerCase());
    if (!movementId) continue;

    // Use deterministic max if available, otherwise use LLM estimate
    let estimatedMaxWeight = parseNumeric(perf.estimated_max_weight);
    let estimatedActualWeight = parseNumeric(perf.estimated_actual_weight);

    // Override with deterministic extraction for the primary movement
    if (deterministicMax !== null && estimatedMaxWeight !== null) {
      // If deterministic differs significantly from LLM, trust deterministic
      if (Math.abs(estimatedMaxWeight - deterministicMax) > 10) {
        estimatedMaxWeight = deterministicMax;
        estimatedActualWeight = deterministicMax;
      }
    }

    // Apply weight sanity bounds
    if (rawDescription) {
      estimatedMaxWeight = sanitizeWeight(estimatedMaxWeight, resolvedName, rawDescription);
      estimatedActualWeight = sanitizeWeight(estimatedActualWeight, resolvedName, rawDescription);
    }

    await db.insert(crossfitUserMovementPerformance).values({
      userScoreId: scoreId,
      movementId,
      estimatedActualWeight,
      estimatedMaxWeight,
      estimatedRepsCompleted: parseInteger(perf.estimated_reps_completed),
      isLimitingFactor: perf.is_limiting_factor ?? false,
      confidence: deterministicMax !== null ? 'high' : 'medium',
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

/**
 * Deterministic scaling inference — replaces the LLM-based Stage 5.
 * Uses Rx history per movement to determine which movements were likely scaled.
 */
async function runScalingInference(
  _client: Anthropic,
  userId: number
): Promise<void> {
  // Get scaled scores
  const scaledScores = await db
    .select({
      id: crossfitUserScores.id,
      workoutId: crossfitUserScores.workoutId,
    })
    .from(crossfitUserScores)
    .where(
      and(
        eq(crossfitUserScores.userId, userId),
        eq(crossfitUserScores.rawDivision, 'Scaled')
      )
    );

  if (scaledScores.length === 0) return;

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

  // Build per-movement Rx rate
  const allUserScoreIds = [...rxScoreIds, ...scaledScores.map((s) => s.id)];
  const allPerf = allUserScoreIds.length > 0 ? await db
    .select({
      userScoreId: crossfitUserMovementPerformance.userScoreId,
      movementId: crossfitUserMovementPerformance.movementId,
    })
    .from(crossfitUserMovementPerformance)
    .where(inArray(crossfitUserMovementPerformance.userScoreId, allUserScoreIds)) : [];

  const rxScoreIdSet = new Set(rxScoreIds);
  const movementRxCounts = new Map<number, { rx: number; total: number }>();
  for (const p of allPerf) {
    const counts = movementRxCounts.get(p.movementId) || { rx: 0, total: 0 };
    counts.total++;
    if (rxScoreIdSet.has(p.userScoreId)) counts.rx++;
    movementRxCounts.set(p.movementId, counts);
  }

  // Process each scaled score
  for (const score of scaledScores) {
    const perfRecords = await db
      .select({
        id: crossfitUserMovementPerformance.id,
        movementId: crossfitUserMovementPerformance.movementId,
        inferredScalingDetail: crossfitUserMovementPerformance.inferredScalingDetail,
      })
      .from(crossfitUserMovementPerformance)
      .where(eq(crossfitUserMovementPerformance.userScoreId, score.id));

    // Skip if already has scaling detail
    if (perfRecords.length > 0 && perfRecords.every((p) => p.inferredScalingDetail)) continue;

    for (const perf of perfRecords) {
      if (perf.inferredScalingDetail) continue;

      const hasEverRxd = rxMovementIds.has(perf.movementId);
      const counts = movementRxCounts.get(perf.movementId);
      const rxRate = counts && counts.total > 0 ? counts.rx / counts.total : 0;

      const movementRow = await db
        .select({ canonicalName: crossfitMovements.canonicalName })
        .from(crossfitMovements)
        .where(eq(crossfitMovements.id, perf.movementId))
        .limit(1);
      const movementName = movementRow[0]?.canonicalName || 'this movement';

      let confidence: string;
      let isLimitingFactor: boolean;
      let inferredScalingDetail: string;

      if (!hasEverRxd) {
        confidence = 'high';
        isLimitingFactor = true;
        inferredScalingDetail = `Never performed ${movementName} Rx — likely substituted or modified`;
      } else if (rxRate < 0.5) {
        confidence = 'medium';
        isLimitingFactor = true;
        inferredScalingDetail = `Scales ${movementName} more often than not — likely a limiting factor`;
      } else {
        confidence = 'low';
        isLimitingFactor = false;
        inferredScalingDetail = `Usually performs ${movementName} Rx — likely scaled weight only`;
      }

      await db
        .update(crossfitUserMovementPerformance)
        .set({ inferredScalingDetail, isLimitingFactor, confidence })
        .where(eq(crossfitUserMovementPerformance.id, perf.id));
    }
  }
}

// ============================================================
// ORCHESTRATOR: Process a chunk of analysis
// ============================================================

export async function processAnalysisChunk(
  userId: number,
  chunkSize: number = 20,
  userGender?: string | null
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

    // Heuristic pre-filter for trivial monthly challenges
    const needsClassification: WorkoutForEnrichment[] = [];
    for (const w of chunk) {
      if (w.rawDescription.length < 80 && w.isMonthlyChallenge) {
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
        needsClassification.push(w);
      }
    }

    // Haiku pre-classification: route simple workouts away from Sonnet
    const needsSonnet: WorkoutForEnrichment[] = [];
    const simpleWorkouts: { workout: WorkoutForEnrichment; classification: HaikuClassification }[] = [];

    if (needsClassification.length > 0) {
      try {
        // Classify in batches of 20 with Haiku (cheap)
        const classifyBatches: WorkoutForEnrichment[][] = [];
        for (let i = 0; i < needsClassification.length; i += HAIKU_BATCH_SIZE) {
          classifyBatches.push(needsClassification.slice(i, i + HAIKU_BATCH_SIZE));
        }

        for (const batch of classifyBatches) {
          const classifications = await classifyWorkoutsBatch(client, batch);
          for (let k = 0; k < Math.min(classifications.length, batch.length); k++) {
            const c = classifications[k];
            if (c.needs_deep_analysis) {
              needsSonnet.push(batch[k]);
            } else {
              simpleWorkouts.push({ workout: batch[k], classification: c });
            }
          }
          // If Haiku returned fewer than expected, send the rest to Sonnet
          for (let k = classifications.length; k < batch.length; k++) {
            needsSonnet.push(batch[k]);
          }
        }
      } catch (err) {
        console.error('Haiku classification failed, falling back to Sonnet for all:', err);
        needsSonnet.push(...needsClassification);
      }
    }

    // Process simple workouts with Haiku classification (no Sonnet needed for enrichment)
    // These still need Sonnet for full enrichment but the classification helps skip obvious ones
    // Actually, for simple workouts we still need proper movement extraction, so send to Sonnet
    // but in larger batches since we know they're straightforward
    const allForSonnet = [
      ...needsSonnet,
      ...simpleWorkouts.map((s) => s.workout),
    ];

    // Batch LLM enrichment with larger batches for simple workouts
    if (allForSonnet.length > 0) {
      const batches: WorkoutForEnrichment[][] = [];
      for (let i = 0; i < allForSonnet.length; i += ENRICHMENT_BATCH_SIZE) {
        batches.push(allForSonnet.slice(i, i + ENRICHMENT_BATCH_SIZE));
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

    const allScores = unanalyzedScores
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

    // Separate scaled (skip LLM) from Rx (needs LLM analysis)
    const scaledScores = allScores.filter((s) => s.rawDivision?.toLowerCase() === 'scaled');
    const rxScores = allScores.filter((s) => s.rawDivision?.toLowerCase() !== 'scaled');

    // Handle scaled scores deterministically — no LLM needed
    for (const score of scaledScores) {
      // Get workout movements from enrichment data
      const workoutMovements = await db
        .select({
          movementId: crossfitWorkoutMovements.movementId,
          canonicalName: crossfitMovements.canonicalName,
        })
        .from(crossfitWorkoutMovements)
        .innerJoin(crossfitMovements, eq(crossfitWorkoutMovements.movementId, crossfitMovements.id))
        .where(eq(crossfitWorkoutMovements.workoutId, score.workoutId));

      // Create movement performance records with null weights
      for (const m of workoutMovements) {
        await db.insert(crossfitUserMovementPerformance).values({
          userScoreId: score.id,
          movementId: m.movementId,
          estimatedActualWeight: null,
          estimatedMaxWeight: null,
          estimatedRepsCompleted: null,
          isLimitingFactor: false,
          confidence: 'low',
        });
      }

      // Determine score type from raw score pattern
      const scoreType = inferScoreType(score.rawScore);

      await db
        .update(crossfitUserScores)
        .set({
          scoreType,
          aiScoreInterpretation: JSON.stringify({ score_type: scoreType, confidence: 'medium', scaled: true }),
          aiAnalysis: JSON.stringify({ source: 'deterministic_scaled', summary: 'Scaled workout — weight data unknown' }),
        })
        .where(eq(crossfitUserScores.id, score.id));

      processed++;
    }

    // Only send Rx scores to LLM
    const scoresToAnalyze = rxScores;

    const scoreBatches: ScoreForAnalysis[][] = [];
    for (let i = 0; i < scoresToAnalyze.length; i += SCORE_BATCH_SIZE) {
      scoreBatches.push(scoresToAnalyze.slice(i, i + SCORE_BATCH_SIZE));
    }

    for (let i = 0; i < scoreBatches.length; i += MAX_CONCURRENT) {
      const concurrentBatches = scoreBatches.slice(i, i + MAX_CONCURRENT);
      const results = await Promise.allSettled(
        concurrentBatches.map((batch) => analyzeScoreBatch(client, batch, userGender))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const batch = concurrentBatches[j];

        if (result.status === 'fulfilled') {
          for (let k = 0; k < result.value.length; k++) {
            await storeScoreResult(batch[k].id, result.value[k], batch[k].rawScore, batch[k].rawDescription);
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

// ============================================================
// MOVEMENT MERGE UTILITY (cleanup existing duplicates)
// ============================================================

/**
 * Finds and merges duplicate movements in the database.
 * Uses the synonym map to identify movements that should be the same.
 * Returns a summary of what was merged.
 */
export async function mergeMovementDuplicates(): Promise<{
  merged: { from: string; to: string; affectedWorkoutMovements: number; affectedPerformance: number }[];
  updatedIs1rm: number;
}> {
  const allMovements = await db.select().from(crossfitMovements);
  const merged: { from: string; to: string; affectedWorkoutMovements: number; affectedPerformance: number }[] = [];

  // Build a map: canonical resolved name → list of movement rows
  const resolvedGroups = new Map<string, typeof allMovements>();
  for (const m of allMovements) {
    const resolved = resolveMovementName(m.canonicalName).toLowerCase();
    if (!resolvedGroups.has(resolved)) resolvedGroups.set(resolved, []);
    resolvedGroups.get(resolved)!.push(m);
  }

  for (const [, group] of resolvedGroups) {
    if (group.length <= 1) continue;

    // Keep the one with the canonical resolved name; merge others into it
    const canonicalName = resolveMovementName(group[0].canonicalName);
    const keeper = group.find((m) => m.canonicalName === canonicalName) || group[0];
    const toMerge = group.filter((m) => m.id !== keeper.id);

    for (const dup of toMerge) {
      // Update workout_movements FK
      const wmUpdated = await db
        .update(crossfitWorkoutMovements)
        .set({ movementId: keeper.id })
        .where(eq(crossfitWorkoutMovements.movementId, dup.id))
        .returning({ id: crossfitWorkoutMovements.id });

      // Update user_movement_performance FK
      const perfUpdated = await db
        .update(crossfitUserMovementPerformance)
        .set({ movementId: keeper.id })
        .where(eq(crossfitUserMovementPerformance.movementId, dup.id))
        .returning({ id: crossfitUserMovementPerformance.id });

      // Delete the duplicate movement
      await db.delete(crossfitMovements).where(eq(crossfitMovements.id, dup.id));

      merged.push({
        from: dup.canonicalName,
        to: keeper.canonicalName,
        affectedWorkoutMovements: wmUpdated.length,
        affectedPerformance: perfUpdated.length,
      });
    }

    // Ensure keeper has the proper canonical name
    if (keeper.canonicalName !== canonicalName) {
      await db
        .update(crossfitMovements)
        .set({ canonicalName })
        .where(eq(crossfitMovements.id, keeper.id));
    }
  }

  // Update is_1rm_applicable for all movements based on the NON_1RM_MOVEMENTS set
  let updatedIs1rm = 0;
  for (const m of allMovements) {
    const shouldBe = is1rmApplicable(m.canonicalName);
    if (m.is1rmApplicable !== shouldBe) {
      await db
        .update(crossfitMovements)
        .set({ is1rmApplicable: shouldBe })
        .where(eq(crossfitMovements.id, m.id));
      updatedIs1rm++;
    }
  }

  // Reset movement cache after merge
  movementCache = null;

  return { merged, updatedIs1rm };
}
