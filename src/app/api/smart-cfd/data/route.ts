import { NextResponse } from 'next/server';
import { db } from '@/db';
import { smartCfdUsers, smartCfdWorkouts, smartCfdMovements } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db
    .select()
    .from(smartCfdUsers)
    .where(eq(smartCfdUsers.id, session.userId))
    .limit(1);

  if (user.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const workouts = await db
    .select()
    .from(smartCfdWorkouts)
    .where(eq(smartCfdWorkouts.userId, session.userId))
    .orderBy(asc(smartCfdWorkouts.workoutDate));

  const movements = await db
    .select()
    .from(smartCfdMovements)
    .where(eq(smartCfdMovements.userId, session.userId));

  // Compute summary
  const rxCount = workouts.filter(
    (w) => w.rawDivision?.toLowerCase() === 'rx'
  ).length;
  const scaledCount = workouts.filter(
    (w) => w.rawDivision?.toLowerCase() === 'scaled'
  ).length;

  const categories: Record<string, number> = {};
  for (const w of workouts) {
    if (w.category) {
      categories[w.category] = (categories[w.category] || 0) + 1;
    }
  }

  // Strength PRs: find all movements that have estimated max weights
  // Group by normalized movement name (case-insensitive, strip trailing 's', collapse synonyms)
  const strengthAliases: Record<string, string> = {
    'back squats': 'Back Squat',
    'back squat': 'Back Squat',
    'barbell back squat': 'Back Squat',
    'front squats': 'Front Squat',
    'front squat': 'Front Squat',
    'overhead squats': 'Overhead Squat',
    'overhead squat': 'Overhead Squat',
    'ohs': 'Overhead Squat',
    'deadlifts': 'Deadlift',
    'deadlift': 'Deadlift',
    'sumo deadlift': 'Sumo Deadlift',
    'sumo deadlifts': 'Sumo Deadlift',
    'push press': 'Push Press',
    'push presses': 'Push Press',
    'strict press': 'Strict Press',
    'strict presses': 'Strict Press',
    'shoulder press': 'Shoulder Press',
    'shoulder presses': 'Shoulder Press',
    'bench press': 'Bench Press',
    'bench presses': 'Bench Press',
    'clean': 'Clean',
    'cleans': 'Clean',
    'power clean': 'Power Clean',
    'power cleans': 'Power Clean',
    'squat clean': 'Squat Clean',
    'squat cleans': 'Squat Clean',
    'clean & jerk': 'Clean & Jerk',
    'clean and jerk': 'Clean & Jerk',
    'clean & jerks': 'Clean & Jerk',
    'snatch': 'Snatch',
    'snatches': 'Snatch',
    'power snatch': 'Power Snatch',
    'power snatches': 'Power Snatch',
    'squat snatch': 'Squat Snatch',
    'squat snatches': 'Squat Snatch',
    'jerk': 'Jerk',
    'jerks': 'Jerk',
    'push jerk': 'Push Jerk',
    'push jerks': 'Push Jerk',
    'split jerk': 'Split Jerk',
    'split jerks': 'Split Jerk',
    'thruster': 'Thruster',
    'thrusters': 'Thruster',
  };

  function normalizeMovementName(name: string): string | null {
    const lower = name.toLowerCase().trim();
    if (strengthAliases[lower]) return strengthAliases[lower];
    return null;
  }

  // Group movements with estimatedMaxWeight by normalized name
  const strengthMovementsByLift = new Map<string, typeof movements>();
  for (const m of movements) {
    if (!m.estimatedMaxWeight) continue;
    const normalized = normalizeMovementName(m.movementName);
    if (!normalized) continue;
    if (!strengthMovementsByLift.has(normalized)) strengthMovementsByLift.set(normalized, []);
    strengthMovementsByLift.get(normalized)!.push(m);
  }

  const strengthPRs: Record<string, {
    estimatedMax: number;
    bestReps: number | null;
    bestWeight: number | null;
    rawScoreMisinterpretation: string | null;
    confidence: string;
    history: { date: string; weight: number }[];
  }> = {};

  for (const [liftName, liftMovements] of strengthMovementsByLift) {
    if (liftMovements.length === 0) continue;

    // Prioritize low-rep heavy sessions (1-3 reps) for 1RM estimation.
    // These are actual strength indicators vs. lighter metcon weights.
    const lowRepMovements = liftMovements.filter((m) => {
      const reps = m.estimatedRepsCompleted ?? m.prescribedReps;
      return reps !== null && reps >= 1 && reps <= 3 && m.estimatedMaxWeight;
    });

    // Use low-rep sessions if available, otherwise fall back to all sessions
    const sourceMovements = lowRepMovements.length > 0 ? lowRepMovements : liftMovements;

    // Find the best estimated max from the prioritized set
    const best = sourceMovements.reduce((a, b) =>
      (a.estimatedMaxWeight || 0) > (b.estimatedMaxWeight || 0) ? a : b
    );

    // Build history of this lift over time (use all sessions for the chart)
    const history: { date: string; weight: number }[] = [];
    for (const m of liftMovements) {
      const workout = workouts.find((w) => w.id === m.workoutId);
      if (workout && m.estimatedMaxWeight) {
        history.push({
          date: workout.workoutDate.toISOString().split('T')[0],
          weight: m.estimatedMaxWeight,
        });
      }
    }
    history.sort((a, b) => a.date.localeCompare(b.date));

    // Check if the raw score was misinterpreted
    let rawScoreMisinterpretation: string | null = null;
    const bestWorkout = workouts.find((w) => w.id === best.workoutId);
    if (bestWorkout?.aiAnalysis) {
      try {
        const analysis = JSON.parse(bestWorkout.aiAnalysis);
        if (
          analysis.score_interpretation?.score_type === 'sum_of_weights' &&
          analysis.score_interpretation?.total_weight_recorded
        ) {
          rawScoreMisinterpretation = `Raw score showed ${analysis.score_interpretation.total_weight_recorded} lbs — that was the sum across ${analysis.score_interpretation.estimated_sets || 'multiple'} sets, not a single lift.`;
        }
      } catch {
        // ignore parse errors
      }
    }

    const bestReps = best.estimatedRepsCompleted ?? best.prescribedReps;

    strengthPRs[liftName] = {
      estimatedMax: best.estimatedMaxWeight!,
      bestReps: bestReps,
      bestWeight: best.estimatedActualWeight,
      rawScoreMisinterpretation,
      confidence: lowRepMovements.length > 0 ? 'high' : (best.confidence || 'medium'),
      history,
    };
  }

  // Similarity clusters
  const clusters: Record<string, number[]> = {};
  for (const w of workouts) {
    if (w.similarityCluster) {
      if (!clusters[w.similarityCluster]) clusters[w.similarityCluster] = [];
      clusters[w.similarityCluster].push(w.id);
    }
  }

  const dates = workouts.map((w) => w.workoutDate.toISOString().split('T')[0]);

  return NextResponse.json({
    user: {
      displayName: user[0].displayName,
      email: user[0].email,
      lastUploadAt: user[0].lastUploadAt,
    },
    summary: {
      totalWorkouts: workouts.length,
      dateRange: dates.length > 0 ? [dates[0], dates[dates.length - 1]] : [],
      rxCount,
      scaledCount,
      categories,
    },
    workouts: workouts.map((w) => ({
      id: w.id,
      rawTitle: w.rawTitle,
      rawDescription: w.rawDescription,
      rawScore: w.rawScore,
      rawDivision: w.rawDivision,
      rawNotes: w.rawNotes,
      workoutDate: w.workoutDate.toISOString().split('T')[0],
      workoutType: w.workoutType,
      scoreType: w.scoreType,
      category: w.category,
      similarityCluster: w.similarityCluster,
      aiSummary: w.aiSummary,
    })),
    movements,
    strengthPRs,
    clusters,
  });
}
