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

  // Get all score IDs and workout IDs for this user
  const userScores = await db
    .select({ id: crossfitUserScores.id, workoutId: crossfitUserScores.workoutId })
    .from(crossfitUserScores)
    .where(eq(crossfitUserScores.userId, session.userId));

  const scoreIds = userScores.map((s) => s.id);
  const workoutIds = [...new Set(userScores.map((s) => s.workoutId))];

  // Delete AI-generated movement performance records (FK to user scores)
  if (scoreIds.length > 0) {
    await db
      .delete(crossfitUserMovementPerformance)
      .where(inArray(crossfitUserMovementPerformance.userScoreId, scoreIds));
  }

  // Clear AI fields on user scores (keep raw data: rawScore, rawDivision, rawNotes)
  if (scoreIds.length > 0) {
    await db
      .update(crossfitUserScores)
      .set({
        scoreType: null,
        aiScoreInterpretation: null,
        aiAnalysis: null,
      })
      .where(eq(crossfitUserScores.userId, session.userId));
  }

  // Delete workout-movement junction records and clear AI enrichment on workouts
  if (workoutIds.length > 0) {
    await db
      .delete(crossfitWorkoutMovements)
      .where(inArray(crossfitWorkoutMovements.workoutId, workoutIds));

    // Clear AI enrichment fields (keep raw data: rawTitle, rawDescription, descriptionHash)
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

  // Delete orphaned movements (they'll be recreated with proper names during re-analysis)
  await db.execute(sql`
    DELETE FROM crossfit_movements
    WHERE id NOT IN (SELECT DISTINCT movement_id FROM crossfit_workout_movements)
  `);

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

  return NextResponse.json({ message: 'AI analysis reset. Raw scores and workouts preserved for re-analysis.' });
}
