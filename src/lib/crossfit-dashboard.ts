import { db } from '@/db';
import {
  crossfitWorkouts,
  crossfitUserScores,
  crossfitMovements,
  crossfitUserMovementPerformance,
  crossfitWorkoutMovements,
  crossfitWorkoutCategories,
  type CrossfitUser,
} from '@/db/schema';
import { eq, asc, inArray } from 'drizzle-orm';

/**
 * Build the full dashboard response for a user.
 * Shared between the authenticated /data route and public /[slug] route.
 */
export async function buildDashboardResponse(
  userId: number,
  user: CrossfitUser,
  includeNotes: boolean
) {
  // Get all user scores with joined workout data
  const scores = await db
    .select({
      scoreId: crossfitUserScores.id,
      workoutId: crossfitUserScores.workoutId,
      workoutDate: crossfitUserScores.workoutDate,
      rawScore: crossfitUserScores.rawScore,
      rawDivision: crossfitUserScores.rawDivision,
      rawNotes: crossfitUserScores.rawNotes,
      scoreType: crossfitUserScores.scoreType,
      aiScoreInterpretation: crossfitUserScores.aiScoreInterpretation,
      aiAnalysis: crossfitUserScores.aiAnalysis,
      // Workout fields
      rawTitle: crossfitWorkouts.rawTitle,
      rawDescription: crossfitWorkouts.rawDescription,
      canonicalTitle: crossfitWorkouts.canonicalTitle,
      titleSource: crossfitWorkouts.titleSource,
      workoutType: crossfitWorkouts.workoutType,
      categoryId: crossfitWorkouts.categoryId,
      similarityCluster: crossfitWorkouts.similarityCluster,
      aiSummary: crossfitWorkouts.aiSummary,
      isMonthlyChallenge: crossfitWorkouts.isMonthlyChallenge,
      descriptionHash: crossfitWorkouts.descriptionHash,
    })
    .from(crossfitUserScores)
    .innerJoin(crossfitWorkouts, eq(crossfitUserScores.workoutId, crossfitWorkouts.id))
    .where(eq(crossfitUserScores.userId, userId))
    .orderBy(asc(crossfitUserScores.workoutDate));

  // Get categories
  const categories = await db.select().from(crossfitWorkoutCategories);
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Get movement performance for this user's scores
  const scoreIds = scores.map((s) => s.scoreId);
  let movementPerformance: {
    userScoreId: number;
    movementId: number;
    canonicalName: string;
    movementCategory: string | null;
    estimatedActualWeight: number | null;
    estimatedMaxWeight: number | null;
    estimatedRepsCompleted: number | null;
    isLimitingFactor: boolean | null;
    limitingFactorScore: number | null;
    inferredScalingDetail: string | null;
    confidence: string | null;
    extractionMethod: string | null;
    isWeighted: boolean | null;
    is1rmApplicable: boolean | null;
  }[] = [];

  if (scoreIds.length > 0) {
    movementPerformance = await db
      .select({
        userScoreId: crossfitUserMovementPerformance.userScoreId,
        movementId: crossfitUserMovementPerformance.movementId,
        canonicalName: crossfitMovements.canonicalName,
        movementCategory: crossfitMovements.movementType,
        estimatedActualWeight: crossfitUserMovementPerformance.estimatedActualWeight,
        estimatedMaxWeight: crossfitUserMovementPerformance.estimatedMaxWeight,
        estimatedRepsCompleted: crossfitUserMovementPerformance.estimatedRepsCompleted,
        isLimitingFactor: crossfitUserMovementPerformance.isLimitingFactor,
        limitingFactorScore: crossfitUserMovementPerformance.limitingFactorScore,
        inferredScalingDetail: crossfitUserMovementPerformance.inferredScalingDetail,
        confidence: crossfitUserMovementPerformance.confidence,
        extractionMethod: crossfitUserMovementPerformance.extractionMethod,
        isWeighted: crossfitMovements.isWeighted,
        is1rmApplicable: crossfitMovements.is1rmApplicable,
      })
      .from(crossfitUserMovementPerformance)
      .innerJoin(crossfitMovements, eq(crossfitUserMovementPerformance.movementId, crossfitMovements.id));
  }

  // Filter to only this user's performance
  const userPerformance = movementPerformance.filter((p) => scoreIds.includes(p.userScoreId));

  // Compute summary (exclude monthly challenges)
  const realScores = scores.filter((s) => !s.isMonthlyChallenge);
  const rxCount = realScores.filter((s) => s.rawDivision?.toLowerCase() === 'rx').length;
  const scaledCount = realScores.filter((s) => s.rawDivision?.toLowerCase() === 'scaled').length;

  const categoryCounts: Record<string, number> = {};
  for (const s of realScores) {
    const catName = s.categoryId ? categoryMap.get(s.categoryId) : null;
    if (catName) categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
  }

  // Count unique workouts and repeat workouts
  const workoutScoreCounts = new Map<number, number>();
  for (const s of realScores) {
    workoutScoreCounts.set(s.workoutId, (workoutScoreCounts.get(s.workoutId) || 0) + 1);
  }
  const uniqueWorkouts = workoutScoreCounts.size;
  const repeatWorkouts = [...workoutScoreCounts.entries()].filter(([, count]) => count > 1).length;

  // Strength PRs from movement performance
  const strengthPRs = computeStrengthPRs(userPerformance, scores);

  // Similarity clusters
  const clusters: Record<string, number[]> = {};
  for (const s of scores) {
    if (s.similarityCluster) {
      if (!clusters[s.similarityCluster]) clusters[s.similarityCluster] = [];
      clusters[s.similarityCluster].push(s.scoreId);
    }
  }

  // Repeat workout progressions
  const repeatWorkoutProgressions = buildRepeatProgressions(scores.map((s) => ({
    ...s,
    rawTitle: s.rawTitle,
    workoutType: s.workoutType,
  })));

  const dates = realScores.map((s) => s.workoutDate.toISOString().split('T')[0]);
  const monthlyChallengeEntries = scores.filter((s) => s.isMonthlyChallenge).length;

  return {
    user: {
      displayName: user.displayName,
      email: user.email,
      lastUploadAt: user.lastUploadAt,
      gender: user.gender ?? null,
    },
    summary: {
      totalScores: realScores.length,
      uniqueWorkouts,
      dateRange: dates.length > 0 ? [dates[0], dates[dates.length - 1]] : [],
      rxCount,
      scaledCount,
      monthlyChallengeEntries,
      categories: categoryCounts,
      repeatWorkouts,
    },
    workouts: scores.map((s) => ({
      scoreId: s.scoreId,
      workoutId: s.workoutId,
      rawTitle: s.rawTitle,
      rawDescription: s.rawDescription,
      canonicalTitle: s.canonicalTitle,
      titleSource: s.titleSource,
      rawScore: s.rawScore,
      rawDivision: s.rawDivision,
      rawNotes: includeNotes ? s.rawNotes : null,
      workoutDate: s.workoutDate.toISOString().split('T')[0],
      workoutType: s.workoutType,
      scoreType: s.scoreType,
      category: s.categoryId ? categoryMap.get(s.categoryId) || null : null,
      categoryId: s.categoryId,
      similarityCluster: s.similarityCluster,
      aiSummary: s.aiSummary,
      isMonthlyChallenge: s.isMonthlyChallenge,
    })),
    movements: userPerformance.map((p) => ({
      userScoreId: p.userScoreId,
      movementId: p.movementId,
      movementName: p.canonicalName,
      movementCategory: p.movementCategory,
      estimatedActualWeight: p.estimatedActualWeight,
      estimatedMaxWeight: p.estimatedMaxWeight,
      estimatedRepsCompleted: p.estimatedRepsCompleted,
      isLimitingFactor: p.isLimitingFactor,
      limitingFactorScore: p.limitingFactorScore,
      inferredScalingDetail: includeNotes ? p.inferredScalingDetail : null,
      confidence: p.confidence,
      extractionMethod: p.extractionMethod,
    })),
    strengthPRs,
    clusters,
    repeatWorkoutProgressions,
    allCategories: categories.map((c) => ({ id: c.id, name: c.name })),
  };
}

/**
 * Estimate 1RM from weight and reps using average of Epley and Brzycki formulas.
 * Only reliable for 1-10 reps. Returns raw weight for 1 rep or >10 reps.
 */
function computeE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return weight;
  if (reps === 1) return weight;
  if (reps > 10) return weight;

  const epley = weight * (1 + reps / 30);
  const brzycki = weight * 36 / (37 - reps);
  return Math.round((epley + brzycki) / 2);
}

function computeStrengthPRs(
  performance: {
    userScoreId: number;
    canonicalName: string;
    estimatedMaxWeight: number | null;
    estimatedActualWeight?: number | null;
    estimatedRepsCompleted: number | null;
    confidence: string | null;
    extractionMethod?: string | null;
    isWeighted: boolean | null;
    is1rmApplicable?: boolean | null;
  }[],
  scores: { scoreId: number; workoutDate: Date; aiScoreInterpretation: string | null; scoreType: string | null; workoutType: string | null }[]
): Record<string, {
  estimatedMax: number;
  bestReps: number | null;
  bestWeight: number | null;
  rawScoreMisinterpretation: string | null;
  confidence: string;
  extractionMethod: string | null;
  e1rmSource: string | null;
  history: { date: string; weight: number }[];
  projected1RM: number | null;
  projectedFrom: string | null;
}> {
  const scoreMap = new Map(scores.map((s) => [s.scoreId, s]));

  // Build set of combined-total score IDs to exclude from strength tracking
  const combinedTotalScoreIds = new Set(
    scores
      .filter((s) => s.scoreType === 'combined_total')
      .map((s) => s.scoreId)
  );

  // Group by movement name — filter out non-1RM-applicable movements
  const byLift = new Map<string, typeof performance>();
  for (const p of performance) {
    if (!p.estimatedMaxWeight || !p.isWeighted) continue;
    // Skip movements where 1RM is meaningless (carries, runs, wall balls, etc.)
    if (p.is1rmApplicable === false) continue;
    // Exclude combined-total workouts (e.g., "Sum of the Best of Each Lift")
    if (combinedTotalScoreIds.has(p.userScoreId)) continue;
    if (!byLift.has(p.canonicalName)) byLift.set(p.canonicalName, []);
    byLift.get(p.canonicalName)!.push(p);
  }

  const result: Record<string, {
    estimatedMax: number;
    bestReps: number | null;
    bestWeight: number | null;
    rawScoreMisinterpretation: string | null;
    confidence: string;
    extractionMethod: string | null;
    e1rmSource: string | null;
    history: { date: string; weight: number }[];
    projected1RM: number | null;
    projectedFrom: string | null;
  }> = {};

  for (const [liftName, liftPerf] of byLift) {
    if (liftPerf.length === 0) continue;

    // Prioritize low-rep sessions (1-3 reps) for 1RM estimation
    const lowRep = liftPerf.filter((p) => {
      const reps = p.estimatedRepsCompleted;
      return reps !== null && reps >= 1 && reps <= 3;
    });

    const source = lowRep.length > 0 ? lowRep : liftPerf;
    // Compare candidates by e1RM (Brzycki/Epley), not raw weight
    const best = source.reduce((a, b) => {
      const aE1RM = computeE1RM(a.estimatedMaxWeight || 0, a.estimatedRepsCompleted || 1);
      const bE1RM = computeE1RM(b.estimatedMaxWeight || 0, b.estimatedRepsCompleted || 1);
      return aE1RM > bE1RM ? a : b;
    });

    const history: { date: string; weight: number }[] = [];
    for (const p of liftPerf) {
      const score = scoreMap.get(p.userScoreId);
      if (score && p.estimatedMaxWeight) {
        history.push({
          date: score.workoutDate.toISOString().split('T')[0],
          weight: p.estimatedMaxWeight,
        });
      }
    }
    history.sort((a, b) => a.date.localeCompare(b.date));

    // Check for score validation info
    let rawScoreMisinterpretation: string | null = null;
    const bestScore = scoreMap.get(best.userScoreId);
    if (bestScore?.aiScoreInterpretation) {
      try {
        const interp = JSON.parse(bestScore.aiScoreInterpretation);
        if (interp.score_type === 'sum_of_weights' && interp.total_weight_recorded) {
          rawScoreMisinterpretation = `Raw score showed ${interp.total_weight_recorded} lbs — that was the sum across ${interp.estimated_sets || 'multiple'} sets, not a single lift.`;
        }
        if (interp.score_validated === false && interp.validation_reasoning) {
          rawScoreMisinterpretation = interp.validation_reasoning;
        }
      } catch { /* ignore */ }
    }

    // Projected 1RM: if best tested 1RM is >2 months old and we have recent strength data
    let projected1RM: number | null = null;
    let projectedFrom: string | null = null;

    const bestDate = bestScore ? bestScore.workoutDate : null;
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    if (bestDate && bestDate < twoMonthsAgo && lowRep.length > 0) {
      // Only use for_load workout data for projections (exclude metcon performances)
      const recentForLoad = liftPerf.filter((p) => {
        const score = scoreMap.get(p.userScoreId);
        if (!score || !p.estimatedMaxWeight) return false;
        const pDate = score.workoutDate;
        const reps = p.estimatedRepsCompleted;
        // Only include for_load workouts, cap reps at 10 for formula reliability
        return pDate > bestDate && reps !== null && reps > 1 && reps <= 10
          && score.workoutType === 'for_load';
      });

      if (recentForLoad.length >= 3) {
        // Use Epley and Brzycki formulas to estimate 1RM from each recent performance
        const estimates: number[] = [];
        for (const p of recentForLoad) {
          const w = p.estimatedMaxWeight!;
          const r = p.estimatedRepsCompleted!;
          if (r > 0 && r <= 10 && w > 0) {
            const epley = w * (1 + r / 30);
            const brzycki = r === 1 ? w : w * 36 / (37 - r);
            estimates.push((epley + brzycki) / 2);
          }
        }

        if (estimates.length >= 3) {
          // Use MEDIAN instead of max — resistant to outliers
          estimates.sort((a, b) => a - b);
          const mid = Math.floor(estimates.length / 2);
          const medianEstimate = estimates.length % 2 === 0
            ? (estimates[mid - 1] + estimates[mid]) / 2
            : estimates[mid];

          const tested1RM = computeE1RM(best.estimatedMaxWeight!, best.estimatedRepsCompleted || 1);

          // Cap projection at 15% above tested/estimated 1RM (sanity bound)
          const maxProjection = tested1RM * 1.15;
          const capped = Math.min(medianEstimate, maxProjection);

          // Only project upward — don't project lower than tested 1RM
          if (capped > tested1RM) {
            projected1RM = Math.round(capped);
            projectedFrom = 'recent strength sessions';
          }
        }
      }
    }

    // Apply e1RM conversion for multi-rep sets
    const bestReps = best.estimatedRepsCompleted || 1;
    const bestRawWeight = best.estimatedMaxWeight!;
    const estimatedMax = computeE1RM(bestRawWeight, bestReps);
    const e1rmSource = bestReps > 1 && bestReps <= 10
      ? `from ${bestReps} × ${Math.round(bestRawWeight)} via Brzycki/Epley`
      : bestReps === 1 ? 'tested' : null;

    result[liftName] = {
      estimatedMax,
      bestReps: best.estimatedRepsCompleted,
      bestWeight: best.estimatedMaxWeight ?? null,
      rawScoreMisinterpretation,
      confidence: lowRep.length > 0 ? 'high' : (best.confidence || 'medium'),
      extractionMethod: (best as { extractionMethod?: string | null }).extractionMethod ?? null,
      e1rmSource,
      history,
      projected1RM,
      projectedFrom,
    };
  }

  return result;
}

// Score parsing utilities for repeat workout comparison
function parseTimeScore(score: string): number | null {
  const match = score.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

function parseAmrapScore(score: string): number | null {
  const match = score.trim().match(/^(\d+)\s*\+\s*(\d+)$/);
  if (!match) return null;
  return parseInt(match[1]) + parseInt(match[2]) / 100;
}

function parseWeightScore(score: string): number | null {
  const match = score.trim().match(/(\d+(?:\.\d+)?)\s*(?:lbs?|#)?$/);
  if (!match) return null;
  return parseFloat(match[1]);
}

function formatTimeDiff(seconds: number): string {
  const abs = Math.abs(seconds);
  const min = Math.floor(abs / 60);
  const sec = abs % 60;
  return min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
}

function buildRepeatProgressions(scores: {
  scoreId: number;
  workoutId: number;
  canonicalTitle: string | null;
  rawTitle: string | null;
  rawScore: string;
  rawDivision: string | null;
  workoutDate: Date;
  workoutType: string | null;
  isMonthlyChallenge: boolean | null;
}[]): {
  workoutId: number;
  title: string;
  scoreType: 'for_time' | 'amrap' | 'for_load' | 'unknown';
  scores: { date: string; score: string; division: string | null; parsedTime?: number; parsedRounds?: number; parsedWeight?: number }[];
  improvement: {
    type: 'scaled_to_rx' | 'time_improvement' | 'rounds_improvement' | 'weight_improvement' | 'mixed';
    summary: string;
    percentChange?: number;
  } | null;
  impressivenessScore: number;
}[] {
  // Group by workoutId
  const byWorkout = new Map<number, typeof scores>();
  for (const s of scores) {
    if (s.isMonthlyChallenge) continue;
    if (!byWorkout.has(s.workoutId)) byWorkout.set(s.workoutId, []);
    byWorkout.get(s.workoutId)!.push(s);
  }

  const progressions: {
    workoutId: number;
    title: string;
    scoreType: 'for_time' | 'amrap' | 'for_load' | 'unknown';
    scores: { date: string; score: string; division: string | null; parsedTime?: number; parsedRounds?: number; parsedWeight?: number }[];
    improvement: {
      type: 'scaled_to_rx' | 'time_improvement' | 'rounds_improvement' | 'weight_improvement' | 'mixed';
      summary: string;
      percentChange?: number;
    } | null;
    impressivenessScore: number;
  }[] = [];

  for (const [workoutId, entries] of byWorkout) {
    if (entries.length < 2) continue;

    const sorted = entries.sort(
      (a, b) => a.workoutDate.getTime() - b.workoutDate.getTime()
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const divFirst = first.rawDivision?.toLowerCase();
    const divLast = last.rawDivision?.toLowerCase();

    // Detect score type from workout type or score patterns
    let scoreType: 'for_time' | 'amrap' | 'for_load' | 'unknown' = 'unknown';
    const wt = first.workoutType;
    if (wt === 'for_time') scoreType = 'for_time';
    else if (wt === 'amrap') scoreType = 'amrap';
    else if (wt === 'for_load') scoreType = 'for_load';

    // Parse scores
    const parsedScores = sorted.map((s) => {
      const base: { date: string; score: string; division: string | null; parsedTime?: number; parsedRounds?: number; parsedWeight?: number } = {
        date: s.workoutDate.toISOString().split('T')[0],
        score: s.rawScore,
        division: s.rawDivision,
      };
      if (scoreType === 'for_time') base.parsedTime = parseTimeScore(s.rawScore) ?? undefined;
      else if (scoreType === 'amrap') base.parsedRounds = parseAmrapScore(s.rawScore) ?? undefined;
      else if (scoreType === 'for_load') base.parsedWeight = parseWeightScore(s.rawScore) ?? undefined;
      return base;
    });

    // Compute improvement
    let improvement: typeof progressions[number]['improvement'] = null;
    let impressivenessScore = 0;

    // Scaled → Rx always ranks highest
    if (divFirst === 'scaled' && divLast === 'rx') {
      const parts: string[] = ['Scaled → Rx'];
      impressivenessScore = 100;

      // Also check for time/score improvement if parseable
      if (scoreType === 'for_time') {
        const firstTime = parsedScores[0].parsedTime;
        const lastTime = parsedScores[parsedScores.length - 1].parsedTime;
        if (firstTime && lastTime && lastTime < firstTime) {
          const diff = firstTime - lastTime;
          const pct = Math.round((diff / firstTime) * 100);
          parts.push(`${formatTimeDiff(diff)} faster`);
          impressivenessScore += pct;
        }
      }

      improvement = {
        type: 'scaled_to_rx',
        summary: parts.join(', '),
        percentChange: undefined,
      };
    } else if (divFirst === divLast || (divFirst && divLast)) {
      // Same division — compare raw scores
      if (scoreType === 'for_time') {
        const firstTime = parsedScores[0].parsedTime;
        const lastTime = parsedScores[parsedScores.length - 1].parsedTime;
        if (firstTime && lastTime) {
          const diff = firstTime - lastTime;
          const pct = Math.round((diff / firstTime) * 100);
          if (diff > 0) {
            improvement = {
              type: 'time_improvement',
              summary: `${formatTimeDiff(diff)} faster (${pct}%)`,
              percentChange: pct,
            };
            impressivenessScore = pct;
          }
        }
      } else if (scoreType === 'amrap') {
        const firstRounds = parsedScores[0].parsedRounds;
        const lastRounds = parsedScores[parsedScores.length - 1].parsedRounds;
        if (firstRounds && lastRounds && lastRounds > firstRounds) {
          const pct = Math.round(((lastRounds - firstRounds) / firstRounds) * 100);
          improvement = {
            type: 'rounds_improvement',
            summary: `${(lastRounds - firstRounds).toFixed(0)}+ more rounds (${pct}%)`,
            percentChange: pct,
          };
          impressivenessScore = pct;
        }
      } else if (scoreType === 'for_load') {
        const firstWeight = parsedScores[0].parsedWeight;
        const lastWeight = parsedScores[parsedScores.length - 1].parsedWeight;
        if (firstWeight && lastWeight && lastWeight > firstWeight) {
          const pct = Math.round(((lastWeight - firstWeight) / firstWeight) * 100);
          improvement = {
            type: 'weight_improvement',
            summary: `+${Math.round(lastWeight - firstWeight)} lbs (${pct}%)`,
            percentChange: pct,
          };
          impressivenessScore = pct;
        }
      }

      // Fallback: if same division but couldn't parse, just note it
      if (!improvement && divFirst === 'rx' && divLast === 'rx') {
        improvement = { type: 'mixed', summary: 'Rx both times', percentChange: undefined };
        impressivenessScore = 10;
      }
    }

    // Bonus for more attempts (more data = more reliable)
    impressivenessScore += entries.length * 2;

    // Scan all entries for the best available title
    const title = sorted.find(e => e.canonicalTitle)?.canonicalTitle
      || sorted.find(e => e.rawTitle)?.rawTitle
      || 'Untitled Workout';

    progressions.push({
      workoutId,
      title,
      scoreType,
      scores: parsedScores,
      improvement,
      impressivenessScore,
    });
  }

  // Sort by impressiveness (Scaled→Rx first, then by % improvement, then by attempts)
  return progressions.sort((a, b) => b.impressivenessScore - a.impressivenessScore);
}
