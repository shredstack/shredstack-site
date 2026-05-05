import { db } from '@/db';
import {
  mobilityExercises,
  mobilityExerciseDays,
  mobilityExerciseVideos,
  mobilitySessions,
  mobilityCompletions,
} from '@/db/schema';
import { asc, desc, isNotNull, isNull, eq } from 'drizzle-orm';
import { hydrateExercises, nextDay } from '@/lib/mobility/program';
import MobilityClient from './components/MobilityClient';

export const dynamic = 'force-dynamic';

export default async function MobilityPage() {
  const [exerciseRows, dayRows, videoRows] = await Promise.all([
    db.select().from(mobilityExercises).orderBy(asc(mobilityExercises.id)),
    db.select().from(mobilityExerciseDays),
    db.select().from(mobilityExerciseVideos),
  ]);
  const exercises = hydrateExercises(exerciseRows, dayRows, videoRows);

  const [activeSession] = await db
    .select()
    .from(mobilitySessions)
    .where(isNull(mobilitySessions.completedAt))
    .orderBy(desc(mobilitySessions.startedAt))
    .limit(1);

  const [lastCompleted] = await db
    .select()
    .from(mobilitySessions)
    .where(isNotNull(mobilitySessions.completedAt))
    .orderBy(desc(mobilitySessions.startedAt))
    .limit(1);

  const completions = activeSession
    ? await db
        .select()
        .from(mobilityCompletions)
        .where(eq(mobilityCompletions.sessionId, activeSession.id))
    : [];

  const suggestedDay = activeSession
    ? activeSession.day
    : nextDay(lastCompleted?.day ?? null);

  return (
    <MobilityClient
      exercises={exercises}
      initialActiveSession={activeSession ?? null}
      initialCompletedExerciseIds={completions.map((c) => c.exerciseId)}
      suggestedDay={suggestedDay}
    />
  );
}
