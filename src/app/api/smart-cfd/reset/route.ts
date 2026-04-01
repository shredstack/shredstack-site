import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  crossfitUsers,
  crossfitWorkouts,
  crossfitUserScores,
  crossfitUserMovementPerformance,
  crossfitWorkoutMovements,
  crossfitMovements,
} from '@/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

export async function POST() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all score IDs for this user
  const userScores = await db
    .select({ id: crossfitUserScores.id, workoutId: crossfitUserScores.workoutId })
    .from(crossfitUserScores)
    .where(eq(crossfitUserScores.userId, session.userId));

  const scoreIds = userScores.map((s) => s.id);
  const workoutIds = [...new Set(userScores.map((s) => s.workoutId))];

  // Delete movement performance records (FK to user scores)
  if (scoreIds.length > 0) {
    await db
      .delete(crossfitUserMovementPerformance)
      .where(inArray(crossfitUserMovementPerformance.userScoreId, scoreIds));
  }

  // Delete user scores
  await db
    .delete(crossfitUserScores)
    .where(eq(crossfitUserScores.userId, session.userId));

  // Delete workout-movement junction records for workouts that only this user used
  // (For a playground with few users, just clean up workout movements and re-enrich)
  if (workoutIds.length > 0) {
    await db
      .delete(crossfitWorkoutMovements)
      .where(inArray(crossfitWorkoutMovements.workoutId, workoutIds));

    // Clear AI enrichment fields on workouts so they get re-enriched
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

  // Reset user status
  await db
    .update(crossfitUsers)
    .set({
      analysisStatus: 'pending',
      analysisProgress: 0,
      cachedInsights: null,
      insightsGeneratedAt: null,
    })
    .where(eq(crossfitUsers.id, session.userId));

  return NextResponse.json({ message: 'Analysis reset. Raw workout data preserved for re-analysis.' });
}
