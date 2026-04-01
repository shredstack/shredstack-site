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
    estimatedActualWeight: number | null;
    estimatedMaxWeight: number | null;
    estimatedRepsCompleted: number | null;
    isLimitingFactor: boolean | null;
    inferredScalingDetail: string | null;
    confidence: string | null;
    isWeighted: boolean | null;
  }[] = [];

  if (scoreIds.length > 0) {
    movementPerformance = await db
      .select({
        userScoreId: crossfitUserMovementPerformance.userScoreId,
        movementId: crossfitUserMovementPerformance.movementId,
        canonicalName: crossfitMovements.canonicalName,
        estimatedActualWeight: crossfitUserMovementPerformance.estimatedActualWeight,
        estimatedMaxWeight: crossfitUserMovementPerformance.estimatedMaxWeight,
        estimatedRepsCompleted: crossfitUserMovementPerformance.estimatedRepsCompleted,
        isLimitingFactor: crossfitUserMovementPerformance.isLimitingFactor,
        inferredScalingDetail: crossfitUserMovementPerformance.inferredScalingDetail,
        confidence: crossfitUserMovementPerformance.confidence,
        isWeighted: crossfitMovements.isWeighted,
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
  const repeatWorkoutProgressions = buildRepeatProgressions(scores);

  const dates = realScores.map((s) => s.workoutDate.toISOString().split('T')[0]);
  const monthlyChallengeEntries = scores.filter((s) => s.isMonthlyChallenge).length;

  return {
    user: {
      displayName: user.displayName,
      email: user.email,
      lastUploadAt: user.lastUploadAt,
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
      similarityCluster: s.similarityCluster,
      aiSummary: s.aiSummary,
      isMonthlyChallenge: s.isMonthlyChallenge,
    })),
    movements: userPerformance.map((p) => ({
      userScoreId: p.userScoreId,
      movementId: p.movementId,
      movementName: p.canonicalName,
      estimatedActualWeight: p.estimatedActualWeight,
      estimatedMaxWeight: p.estimatedMaxWeight,
      estimatedRepsCompleted: p.estimatedRepsCompleted,
      isLimitingFactor: p.isLimitingFactor,
      inferredScalingDetail: includeNotes ? p.inferredScalingDetail : null,
      confidence: p.confidence,
    })),
    strengthPRs,
    clusters,
    repeatWorkoutProgressions,
  };
}

function computeStrengthPRs(
  performance: {
    userScoreId: number;
    canonicalName: string;
    estimatedMaxWeight: number | null;
    estimatedActualWeight?: number | null;
    estimatedRepsCompleted: number | null;
    confidence: string | null;
    isWeighted: boolean | null;
  }[],
  scores: { scoreId: number; workoutDate: Date; aiScoreInterpretation: string | null }[]
): Record<string, {
  estimatedMax: number;
  bestReps: number | null;
  bestWeight: number | null;
  rawScoreMisinterpretation: string | null;
  confidence: string;
  history: { date: string; weight: number }[];
}> {
  const scoreMap = new Map(scores.map((s) => [s.scoreId, s]));

  // Group by movement name
  const byLift = new Map<string, typeof performance>();
  for (const p of performance) {
    if (!p.estimatedMaxWeight || !p.isWeighted) continue;
    if (!byLift.has(p.canonicalName)) byLift.set(p.canonicalName, []);
    byLift.get(p.canonicalName)!.push(p);
  }

  const result: Record<string, {
    estimatedMax: number;
    bestReps: number | null;
    bestWeight: number | null;
    rawScoreMisinterpretation: string | null;
    confidence: string;
    history: { date: string; weight: number }[];
  }> = {};

  for (const [liftName, liftPerf] of byLift) {
    if (liftPerf.length === 0) continue;

    // Prioritize low-rep sessions (1-3 reps) for 1RM estimation
    const lowRep = liftPerf.filter((p) => {
      const reps = p.estimatedRepsCompleted;
      return reps !== null && reps >= 1 && reps <= 3;
    });

    const source = lowRep.length > 0 ? lowRep : liftPerf;
    const best = source.reduce((a, b) =>
      (a.estimatedMaxWeight || 0) > (b.estimatedMaxWeight || 0) ? a : b
    );

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

    result[liftName] = {
      estimatedMax: best.estimatedMaxWeight!,
      bestReps: best.estimatedRepsCompleted,
      bestWeight: (best as { estimatedActualWeight?: number | null }).estimatedActualWeight ?? null,
      rawScoreMisinterpretation,
      confidence: lowRep.length > 0 ? 'high' : (best.confidence || 'medium'),
      history,
    };
  }

  return result;
}

function buildRepeatProgressions(scores: {
  scoreId: number;
  workoutId: number;
  canonicalTitle: string | null;
  rawScore: string;
  rawDivision: string | null;
  workoutDate: Date;
  isMonthlyChallenge: boolean | null;
}[]): {
  workoutId: number;
  title: string;
  scores: { date: string; score: string; division: string | null }[];
  improvement: string | null;
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
    scores: { date: string; score: string; division: string | null }[];
    improvement: string | null;
  }[] = [];

  for (const [workoutId, entries] of byWorkout) {
    if (entries.length < 2) continue;

    const sorted = entries.sort(
      (a, b) => a.workoutDate.getTime() - b.workoutDate.getTime()
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // Simple improvement description
    let improvement: string | null = null;
    const divFirst = first.rawDivision?.toLowerCase();
    const divLast = last.rawDivision?.toLowerCase();
    if (divFirst === 'scaled' && divLast === 'rx') {
      improvement = 'Scaled → Rx';
    } else if (divFirst === 'rx' && divLast === 'rx') {
      improvement = 'Rx both times';
    }

    progressions.push({
      workoutId,
      title: entries[0].canonicalTitle || 'Untitled Workout',
      scores: sorted.map((s) => ({
        date: s.workoutDate.toISOString().split('T')[0],
        score: s.rawScore,
        division: s.rawDivision,
      })),
      improvement,
    });
  }

  return progressions.sort((a, b) => b.scores.length - a.scores.length);
}
