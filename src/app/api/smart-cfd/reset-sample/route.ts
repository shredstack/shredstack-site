import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  crossfitUsers,
  crossfitWorkouts,
  crossfitUserScores,
  crossfitUserMovementPerformance,
  crossfitWorkoutMovements,
} from '@/db/schema';
import { eq, inArray, sql, and, notInArray } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const sampleSize = Math.max(10, Math.min(body.sampleSize || 100, 500));

  // 1. Get all user scores
  const allScores = await db
    .select({
      id: crossfitUserScores.id,
      workoutId: crossfitUserScores.workoutId,
      rawDivision: crossfitUserScores.rawDivision,
      workoutDate: crossfitUserScores.workoutDate,
    })
    .from(crossfitUserScores)
    .where(eq(crossfitUserScores.userId, session.userId));

  if (allScores.length === 0) {
    return NextResponse.json({ error: 'No scores to sample from' }, { status: 400 });
  }

  // 2. Get workout metadata for sampling
  const workoutIds = [...new Set(allScores.map((s) => s.workoutId))];
  const workouts = workoutIds.length > 0 ? await db
    .select({
      id: crossfitWorkouts.id,
      rawDescription: crossfitWorkouts.rawDescription,
      isMonthlyChallenge: crossfitWorkouts.isMonthlyChallenge,
    })
    .from(crossfitWorkouts)
    .where(inArray(crossfitWorkouts.id, workoutIds)) : [];

  const workoutMap = new Map(workouts.map((w) => [w.id, w]));
  const monthlyChallengeWorkoutIds = new Set(
    workouts.filter((w) => w.isMonthlyChallenge).map((w) => w.id)
  );

  // 3. Split into challenges vs real workouts
  const challengeScores = allScores.filter((s) => monthlyChallengeWorkoutIds.has(s.workoutId));
  const realScores = allScores.filter((s) => !monthlyChallengeWorkoutIds.has(s.workoutId));

  // 4. Build sample maintaining distribution
  // Monthly challenges: <1% of sample (at least 1 if any exist, max 2)
  const challengeCount = Math.min(challengeScores.length, Math.max(1, Math.floor(sampleSize * 0.01)), 2);
  const realCount = sampleSize - challengeCount;

  // Shuffle for random selection
  const shuffled = [...realScores].sort(() => Math.random() - 0.5);

  // Group by workout description for repeat detection
  const descGroups = new Map<number, typeof allScores>();
  for (const s of realScores) {
    if (!descGroups.has(s.workoutId)) descGroups.set(s.workoutId, []);
    descGroups.get(s.workoutId)!.push(s);
  }
  const repeatWorkoutIds = [...descGroups.entries()]
    .filter(([, scores]) => scores.length > 1)
    .map(([wid]) => wid);

  // Strategy: ensure repeats, Rx/Scaled mix, then fill randomly
  const sampled = new Set<number>();

  // A. Include all entries from some repeat groups (for progression testing)
  const shuffledRepeats = [...repeatWorkoutIds].sort(() => Math.random() - 0.5);
  for (const wid of shuffledRepeats) {
    if (sampled.size >= Math.floor(realCount * 0.15)) break; // Cap repeats at 15%
    const group = descGroups.get(wid)!;
    for (const s of group) sampled.add(s.id);
  }

  // B. Ensure some Scaled entries
  const scaledScores = shuffled.filter((s) => s.rawDivision?.toLowerCase() === 'scaled');
  for (const s of scaledScores) {
    if (sampled.size >= realCount) break;
    const scaledInSample = [...sampled].filter((id) =>
      allScores.find((sc) => sc.id === id)?.rawDivision?.toLowerCase() === 'scaled'
    ).length;
    if (scaledInSample >= Math.floor(realCount * 0.35)) break; // ~35% scaled
    sampled.add(s.id);
  }

  // C. Fill remaining randomly
  for (const s of shuffled) {
    if (sampled.size >= realCount) break;
    sampled.add(s.id);
  }

  // D. Add monthly challenges
  const shuffledChallenges = [...challengeScores].sort(() => Math.random() - 0.5);
  for (let i = 0; i < challengeCount && i < shuffledChallenges.length; i++) {
    sampled.add(shuffledChallenges[i].id);
  }

  const sampledIds = [...sampled];
  const skippedIds = allScores.map((s) => s.id).filter((id) => !sampled.has(id));

  // 5. Full reset (same as /reset)
  const allScoreIds = allScores.map((s) => s.id);

  if (allScoreIds.length > 0) {
    await db
      .delete(crossfitUserMovementPerformance)
      .where(inArray(crossfitUserMovementPerformance.userScoreId, allScoreIds));
  }

  if (allScoreIds.length > 0) {
    await db
      .update(crossfitUserScores)
      .set({ scoreType: null, aiScoreInterpretation: null, aiAnalysis: null })
      .where(eq(crossfitUserScores.userId, session.userId));
  }

  if (workoutIds.length > 0) {
    await db
      .delete(crossfitWorkoutMovements)
      .where(inArray(crossfitWorkoutMovements.workoutId, workoutIds));

    for (const wid of workoutIds) {
      await db
        .update(crossfitWorkouts)
        .set({
          canonicalTitle: null,
          titleSource: 'raw',
          workoutType: null,
          categoryId: null,
          similarityCluster: null,
          aiSummary: null,
          isMonthlyChallenge: false,
        })
        .where(eq(crossfitWorkouts.id, wid));
    }
  }

  await db.execute(sql`
    DELETE FROM crossfit_movements
    WHERE id NOT IN (SELECT DISTINCT movement_id FROM crossfit_workout_movements)
  `);

  // 6. Mark skipped scores so the pipeline ignores them
  // Set aiAnalysis to a placeholder — pipeline only processes scores where aiAnalysis IS NULL
  if (skippedIds.length > 0) {
    // Batch in chunks to avoid query size limits
    const chunkSize = 500;
    for (let i = 0; i < skippedIds.length; i += chunkSize) {
      const chunk = skippedIds.slice(i, i + chunkSize);
      await db
        .update(crossfitUserScores)
        .set({ aiAnalysis: '{"skipped_sample":true}' })
        .where(inArray(crossfitUserScores.id, chunk));
    }
  }

  // 7. Also mark workouts NOT referenced by sampled scores as already enriched
  // so the pipeline doesn't waste LLM calls enriching unused workouts
  const sampledWorkoutIds = new Set(
    allScores.filter((s) => sampled.has(s.id)).map((s) => s.workoutId)
  );
  const skippedWorkoutIds = workoutIds.filter((wid) => !sampledWorkoutIds.has(wid));

  if (skippedWorkoutIds.length > 0) {
    for (const wid of skippedWorkoutIds) {
      await db
        .update(crossfitWorkouts)
        .set({ workoutType: 'other', aiSummary: 'Skipped (sample mode)' })
        .where(eq(crossfitWorkouts.id, wid));
    }
  }

  // 8. Reset user status
  await db
    .update(crossfitUsers)
    .set({
      analysisStatus: 'pending',
      analysisProgress: 0,
      cachedInsights: null,
      insightsGeneratedAt: null,
    })
    .where(eq(crossfitUsers.id, session.userId));

  return NextResponse.json({
    message: `Sample reset complete. ${sampledIds.length} scores will be analyzed (${skippedIds.length} skipped).`,
    sampleSize: sampledIds.length,
    skipped: skippedIds.length,
    total: allScores.length,
    sampledWorkouts: sampledWorkoutIds.size,
    skippedWorkouts: skippedWorkoutIds.length,
  });
}
