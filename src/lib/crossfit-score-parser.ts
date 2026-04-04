/**
 * Deterministic Score Parser — Tier 1 of the three-tier score processing pipeline.
 *
 * Parses ~60% of CrossFit scores without any AI call. Classifies score format,
 * extracts structured values, and determines confidence. Scores that can't be
 * parsed deterministically are routed to Tier 2 (Haiku) or Tier 3 (Sonnet).
 */

// ============================================================
// TYPES
// ============================================================

export type ScoreFormat = 'time' | 'rounds_reps' | 'reps_at_weight' | 'plain_number' | 'complete' | 'empty' | 'other';
export type WorkoutType = 'for_time' | 'amrap' | 'for_load' | 'emom' | 'for_reps' | 'tabata' | 'other';
export type RepSchemeType = 'build_to_max' | 'uniform_sets' | 'all_singles' | 'descending' | 'other';
export type InterpretationType =
  | 'time_score' | 'amrap_score' | 'one_rm' | 'multi_rm' | 'sum_of_weights'
  | 'time_capped_reps' | 'total_reps' | 'calories' | 'distance' | 'complete' | 'unknown';

export interface ScoreInterpretation {
  type: InterpretationType;
  estimatedMaxWeight?: number;
  estimatedReps?: number;
  e1RM?: number;
  timeSeconds?: number;
  totalReps?: number;
  amrapDecomposition?: AmrapMovementReps[];
}

export interface AmrapMovementReps {
  movementName: string;
  prescribedReps: number;
  completedReps: number;
}

export interface ParsedScore {
  // Score format classification
  scoreFormat: ScoreFormat;

  // Extracted raw values
  timeSeconds?: number;
  rounds?: number;
  remainderReps?: number;
  reps?: number;
  weight?: number;
  plainNumber?: number;

  // Workout context
  workoutType: WorkoutType;
  repScheme?: string;
  repSchemeType?: RepSchemeType;
  movementCount?: number;
  timeCapMinutes?: number;

  // Interpretation
  interpretation: ScoreInterpretation;
  confidence: 'high' | 'medium' | 'low';
  needsAI: boolean;
  aiTier?: 'haiku' | 'sonnet';
  aiContext?: string;
}

// ============================================================
// SCORE FORMAT PARSING
// ============================================================

function parseTimeString(score: string): number | null {
  const s = score.trim();
  // MM:SS or M:SS
  const mmss = s.match(/^(\d{1,2}):(\d{2})$/);
  if (mmss) return parseInt(mmss[1]) * 60 + parseInt(mmss[2]);
  // M:SS.d (with fractional seconds)
  const frac = s.match(/^(\d{1,2}):(\d{2})\.(\d+)$/);
  if (frac) return parseInt(frac[1]) * 60 + parseInt(frac[2]) + parseFloat(`0.${frac[3]}`);
  // H:MM:SS
  const hmmss = s.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (hmmss) return parseInt(hmmss[1]) * 3600 + parseInt(hmmss[2]) * 60 + parseInt(hmmss[3]);
  return null;
}

function parseRoundsReps(score: string): { rounds: number; remainderReps: number } | null {
  const match = score.trim().match(/^(\d+)\s*\+\s*(\d+)$/);
  if (!match) return null;
  return { rounds: parseInt(match[1]), remainderReps: parseInt(match[2]) };
}

function parseRepsAtWeight(score: string): { reps: number; weight: number } | null {
  const match = score.trim().match(/^(\d+)\s*@\s*([\d.]+)$/);
  if (!match) return null;
  return { reps: parseInt(match[1]), weight: parseFloat(match[2]) };
}

function parsePlainNumber(score: string): number | null {
  const s = score.trim();
  if (/^\d+$/.test(s)) return parseInt(s);
  return null;
}

function isComplete(score: string): boolean {
  return /^complet/i.test(score.trim());
}

function isEmpty(score: string): boolean {
  return score.trim() === '';
}

export function classifyScoreFormat(rawScore: string): {
  format: ScoreFormat;
  timeSeconds?: number;
  rounds?: number;
  remainderReps?: number;
  reps?: number;
  weight?: number;
  plainNumber?: number;
} {
  const s = rawScore.trim();
  if (isEmpty(s)) return { format: 'empty' };
  if (isComplete(s)) return { format: 'complete' };

  const time = parseTimeString(s);
  if (time !== null) return { format: 'time', timeSeconds: time };

  const rr = parseRoundsReps(s);
  if (rr) return { format: 'rounds_reps', rounds: rr.rounds, remainderReps: rr.remainderReps };

  const raw = parseRepsAtWeight(s);
  if (raw) return { format: 'reps_at_weight', reps: raw.reps, weight: raw.weight };

  const num = parsePlainNumber(s);
  if (num !== null) return { format: 'plain_number', plainNumber: num };

  return { format: 'other' };
}

// ============================================================
// WORKOUT TYPE INFERENCE
// ============================================================

export function inferWorkoutType(description: string): WorkoutType {
  const lower = description.toLowerCase();
  if (lower.includes('for time')) return 'for_time';
  if (lower.includes('amrap')) return 'amrap';
  if (lower.includes('emom') || lower.includes('every ')) return 'emom';
  if (lower.includes('for load')) return 'for_load';
  if (lower.includes('tabata')) return 'tabata';
  if (lower.includes('for reps')) return 'for_reps';
  return 'other';
}

// ============================================================
// REP SCHEME PARSING & CLASSIFICATION
// ============================================================

export function extractRepScheme(description: string): string | null {
  const match = description.match(/\b(\d+(?:-\d+){2,})\b/);
  return match ? match[1] : null;
}

export function classifyRepScheme(scheme: string): RepSchemeType {
  const parts = scheme.split('-').map(Number);
  if (parts.some(isNaN)) return 'other';
  if (parts.every(p => p === 1)) return 'all_singles';
  if (parts.every(p => p === parts[0])) return 'uniform_sets';
  if (parts[parts.length - 1] === 1 && parts[0] > 1) return 'build_to_max';
  if (parts.every((p, i) => i === 0 || p <= parts[i - 1])) return 'descending';
  return 'other';
}

// ============================================================
// TIME CAP DETECTION
// ============================================================

function extractTimeCap(description: string): number | null {
  // "20 min time cap", "TC: 15", "Time Cap: 12 minutes"
  const match = description.match(/(?:time\s*cap|tc)\s*:?\s*(\d+)\s*(?:min|minutes)?/i);
  if (match) return parseInt(match[1]);
  // "For Time (15 min cap)"
  const match2 = description.match(/\((\d+)\s*(?:min|minute)\s*cap\)/i);
  if (match2) return parseInt(match2[1]);
  return null;
}

// ============================================================
// E1RM COMPUTATION
// ============================================================

export function computeE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return weight;
  if (reps === 1) return weight;
  if (reps > 10) return weight;

  const epley = weight * (1 + reps / 30);
  const brzycki = weight * 36 / (37 - reps);
  return Math.round((epley + brzycki) / 2);
}

// ============================================================
// AMRAP DECOMPOSITION
// ============================================================

/**
 * Deterministically decompose an AMRAP score into per-movement rep counts.
 * Given rounds + remainder reps and the prescribed movement list (in order),
 * distributes reps across movements following standard AMRAP round structure.
 */
export function decomposeAmrapScore(
  rounds: number,
  remainderReps: number,
  movements: { name: string; prescribedReps: number }[]
): AmrapMovementReps[] {
  if (movements.length === 0) return [];

  const repsPerRound = movements.reduce((sum, m) => sum + m.prescribedReps, 0);
  if (repsPerRound === 0) return [];

  const result: AmrapMovementReps[] = movements.map(m => ({
    movementName: m.name,
    prescribedReps: m.prescribedReps,
    completedReps: rounds * m.prescribedReps,
  }));

  // Distribute remainder reps across movements in order
  let remaining = remainderReps;
  for (const entry of result) {
    const movement = movements.find(m => m.name === entry.movementName)!;
    const extraReps = Math.min(remaining, movement.prescribedReps);
    entry.completedReps += extraReps;
    remaining -= extraReps;
    if (remaining <= 0) break;
  }

  return result;
}

/**
 * Decompose a time-capped score (plain number of total reps) into per-movement reps.
 * Same logic as AMRAP — the plain number IS the total reps completed.
 */
export function decomposeTimeCappedScore(
  totalReps: number,
  movements: { name: string; prescribedReps: number }[]
): AmrapMovementReps[] {
  if (movements.length === 0 || totalReps <= 0) return [];

  const repsPerRound = movements.reduce((sum, m) => sum + m.prescribedReps, 0);
  if (repsPerRound === 0) return [];

  const fullRounds = Math.floor(totalReps / repsPerRound);
  const remainder = totalReps % repsPerRound;

  return decomposeAmrapScore(fullRounds, remainder, movements);
}

// ============================================================
// FOR_LOAD SCORE INTERPRETATION
// ============================================================

function interpretForLoadScore(
  reps: number,
  weight: number,
  repScheme: string | null,
  repSchemeType: RepSchemeType | undefined,
): { interpretation: ScoreInterpretation; confidence: 'high' | 'medium' | 'low'; needsAI: boolean; aiTier?: 'haiku' | 'sonnet' } {
  if (!repScheme) {
    // No rep scheme found — can still interpret "1 @ W" as a 1RM
    if (reps === 1) {
      return {
        interpretation: { type: 'one_rm', estimatedMaxWeight: weight, estimatedReps: 1, e1RM: weight },
        confidence: 'high',
        needsAI: false,
      };
    }
    // Without a rep scheme, we need AI to figure out if weight is per-set or sum
    return {
      interpretation: { type: 'unknown' },
      confidence: 'low',
      needsAI: true,
      aiTier: 'haiku',
    };
  }

  const parts = repScheme.split('-').map(Number);
  const totalSchemeReps = parts.reduce((a, b) => a + b, 0);
  const numSets = parts.length;

  // Case 1: Build to max (3-2-2-1-1-1, 5-3-1)
  // Weight IS the max — the heavy single at the end
  if (repSchemeType === 'build_to_max') {
    const maxReps = parts[parts.length - 1]; // typically 1
    return {
      interpretation: {
        type: maxReps === 1 ? 'one_rm' : 'multi_rm',
        estimatedMaxWeight: weight,
        estimatedReps: reps,
        e1RM: computeE1RM(weight, maxReps),
      },
      confidence: 'high',
      needsAI: false,
    };
  }

  // Case 2: All singles (1-1-1-1-1)
  // "N @ W" where N = number of singles → W is likely the SUM
  if (repSchemeType === 'all_singles' && reps === numSets) {
    const perSingle = Math.round(weight / numSets);
    return {
      interpretation: {
        type: 'sum_of_weights',
        estimatedMaxWeight: perSingle,
        estimatedReps: 1,
        e1RM: perSingle,
      },
      confidence: 'high',
      needsAI: false,
    };
  }

  // Case 3: Uniform sets (5-5-5, 2-2-2-2-2, 3-3-3-3-3)
  if (repSchemeType === 'uniform_sets') {
    const repsPerSet = parts[0];

    // If N = total reps, weight is likely the sum
    if (reps === totalSchemeReps) {
      const perSet = Math.round(weight / numSets);
      return {
        interpretation: {
          type: 'sum_of_weights',
          estimatedMaxWeight: perSet,
          estimatedReps: repsPerSet,
          e1RM: computeE1RM(perSet, repsPerSet),
        },
        confidence: 'medium',
        needsAI: true,
        aiTier: 'haiku',
      };
    }

    // If N doesn't match total reps, weight is per-set
    return {
      interpretation: {
        type: 'multi_rm',
        estimatedMaxWeight: weight,
        estimatedReps: reps,
        e1RM: computeE1RM(weight, reps),
      },
      confidence: 'medium',
      needsAI: false,
    };
  }

  // Case 4: Descending (10-8-6-4-2)
  if (repSchemeType === 'descending') {
    // If N = total reps, likely a sum
    if (reps === totalSchemeReps) {
      const perSet = Math.round(weight / numSets);
      return {
        interpretation: {
          type: 'sum_of_weights',
          estimatedMaxWeight: perSet,
          estimatedReps: parts[parts.length - 1], // heaviest at lowest reps
          e1RM: computeE1RM(perSet, parts[parts.length - 1]),
        },
        confidence: 'medium',
        needsAI: true,
        aiTier: 'haiku',
      };
    }
  }

  // Fallback — needs AI
  return {
    interpretation: { type: 'unknown' },
    confidence: 'low',
    needsAI: true,
    aiTier: 'haiku',
  };
}

// ============================================================
// MAIN PARSER
// ============================================================

/**
 * Parse a raw score string with workout context to produce a structured interpretation.
 * This is Tier 1 of the three-tier pipeline — zero AI cost.
 */
export function parseScore(
  rawScore: string,
  rawDescription: string,
  movements?: { name: string; prescribedReps: number }[],
): ParsedScore {
  const { format, timeSeconds, rounds, remainderReps, reps, weight, plainNumber } = classifyScoreFormat(rawScore);
  const workoutType = inferWorkoutType(rawDescription);
  const repScheme = extractRepScheme(rawDescription);
  const repSchemeType = repScheme ? classifyRepScheme(repScheme) : undefined;
  const timeCapMinutes = extractTimeCap(rawDescription);
  const movementCount = movements?.length;

  const base = {
    scoreFormat: format,
    timeSeconds,
    rounds,
    remainderReps,
    reps,
    weight,
    plainNumber,
    workoutType,
    repScheme: repScheme ?? undefined,
    repSchemeType,
    movementCount,
    timeCapMinutes: timeCapMinutes ?? undefined,
  };

  // Empty scores
  if (format === 'empty') {
    return { ...base, interpretation: { type: 'unknown' }, confidence: 'low', needsAI: false };
  }

  // Complete scores
  if (format === 'complete') {
    return { ...base, interpretation: { type: 'complete' }, confidence: 'high', needsAI: false };
  }

  // FOR_TIME + TIME (straightforward)
  if (workoutType === 'for_time' && format === 'time' && timeSeconds != null) {
    return { ...base, interpretation: { type: 'time_score', timeSeconds }, confidence: 'high', needsAI: false };
  }

  // FOR_TIME + PLAIN_NUMBER (time-capped — didn't finish)
  if (workoutType === 'for_time' && format === 'plain_number' && plainNumber != null && timeCapMinutes) {
    const decomposition = movements ? decomposeTimeCappedScore(plainNumber, movements) : undefined;
    return {
      ...base,
      interpretation: { type: 'time_capped_reps', totalReps: plainNumber, amrapDecomposition: decomposition },
      confidence: 'high',
      needsAI: false,
    };
  }

  // AMRAP + ROUNDS_REPS
  if (workoutType === 'amrap' && format === 'rounds_reps' && rounds != null && remainderReps != null) {
    const decomposition = movements ? decomposeAmrapScore(rounds, remainderReps, movements) : undefined;
    return {
      ...base,
      interpretation: { type: 'amrap_score', amrapDecomposition: decomposition },
      confidence: 'high',
      needsAI: false,
    };
  }

  // AMRAP + PLAIN_NUMBER (some gyms score AMRAPs as total reps)
  if (workoutType === 'amrap' && format === 'plain_number' && plainNumber != null) {
    const decomposition = movements ? decomposeTimeCappedScore(plainNumber, movements) : undefined;
    return {
      ...base,
      interpretation: { type: 'amrap_score', totalReps: plainNumber, amrapDecomposition: decomposition },
      confidence: 'medium',
      needsAI: false,
    };
  }

  // FOR_LOAD + REPS_AT_WEIGHT
  if (workoutType === 'for_load' && format === 'reps_at_weight' && reps != null && weight != null) {
    const result = interpretForLoadScore(reps, weight, repScheme, repSchemeType);
    return { ...base, ...result };
  }

  // FOR_LOAD + PLAIN_NUMBER (just a weight, assumed 1RM)
  if (workoutType === 'for_load' && format === 'plain_number' && plainNumber != null) {
    return {
      ...base,
      interpretation: { type: 'one_rm', estimatedMaxWeight: plainNumber, estimatedReps: 1, e1RM: plainNumber },
      confidence: 'medium',
      needsAI: false,
    };
  }

  // EMOM + TIME
  if (workoutType === 'emom' && format === 'time') {
    return { ...base, interpretation: { type: 'complete' }, confidence: 'high', needsAI: false };
  }

  // FOR_REPS + PLAIN_NUMBER
  if (workoutType === 'for_reps' && format === 'plain_number' && plainNumber != null) {
    return {
      ...base,
      interpretation: { type: 'total_reps', totalReps: plainNumber },
      confidence: 'high',
      needsAI: false,
    };
  }

  // TIME format but not for_time workout (could be EMOM, etc.)
  if (format === 'time' && timeSeconds != null) {
    return { ...base, interpretation: { type: 'time_score', timeSeconds }, confidence: 'medium', needsAI: false };
  }

  // Fallback — needs AI
  const aiContext = buildAIContext(rawScore, rawDescription, format, workoutType, repScheme, repSchemeType);
  return {
    ...base,
    interpretation: { type: 'unknown' },
    confidence: 'low',
    needsAI: true,
    aiTier: 'sonnet',
    aiContext,
  };
}

// ============================================================
// AI CONTEXT BUILDER
// ============================================================

function buildAIContext(
  rawScore: string,
  rawDescription: string,
  format: ScoreFormat,
  workoutType: WorkoutType,
  repScheme: string | null,
  repSchemeType: RepSchemeType | undefined,
): string {
  const lines: string[] = [
    `Score format: ${format}`,
    `Workout type: ${workoutType}`,
  ];
  if (repScheme) {
    lines.push(`Rep scheme: ${repScheme} (${repSchemeType || 'unclassified'})`);
  }
  lines.push(`Raw score: "${rawScore}"`);
  lines.push(`Description snippet: "${rawDescription.substring(0, 200)}"`);
  return lines.join('\n');
}

// ============================================================
// BATCH PARSER — classify an array of scores
// ============================================================

export interface ScoreForParsing {
  id: number;
  rawScore: string;
  rawDescription: string;
  movements?: { name: string; prescribedReps: number }[];
}

export interface ParsedScoreResult extends ParsedScore {
  scoreId: number;
}

/**
 * Parse a batch of scores, returning structured results with tier routing info.
 */
export function parseBatch(scores: ScoreForParsing[]): {
  deterministic: ParsedScoreResult[];
  needsHaiku: ParsedScoreResult[];
  needsSonnet: ParsedScoreResult[];
} {
  const deterministic: ParsedScoreResult[] = [];
  const needsHaiku: ParsedScoreResult[] = [];
  const needsSonnet: ParsedScoreResult[] = [];

  for (const score of scores) {
    const parsed = parseScore(score.rawScore, score.rawDescription, score.movements);
    const result: ParsedScoreResult = { ...parsed, scoreId: score.id };

    if (!parsed.needsAI) {
      deterministic.push(result);
    } else if (parsed.aiTier === 'haiku') {
      needsHaiku.push(result);
    } else {
      needsSonnet.push(result);
    }
  }

  return { deterministic, needsHaiku, needsSonnet };
}
