import { db } from '@/db';
import {
  mobilityExercises,
  mobilityExerciseDays,
  mobilityExerciseVideos,
  mobilitySessions,
  mobilityCompletions,
} from '@/db/schema';
import { asc, desc, gte, inArray } from 'drizzle-orm';
import { hydrateExercises } from '@/lib/mobility/program';
import HistoryClient from './components/HistoryClient';

export const dynamic = 'force-dynamic';

export default async function MobilityHistoryPage() {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const cutoff = sixtyDaysAgo.toISOString().slice(0, 10);

  const sessions = await db
    .select()
    .from(mobilitySessions)
    .where(gte(mobilitySessions.sessionDate, cutoff))
    .orderBy(desc(mobilitySessions.startedAt));

  const [exerciseRows, dayRows, videoRows] = await Promise.all([
    db.select().from(mobilityExercises).orderBy(asc(mobilityExercises.id)),
    db.select().from(mobilityExerciseDays),
    db.select().from(mobilityExerciseVideos),
  ]);
  const exercises = hydrateExercises(exerciseRows, dayRows, videoRows);

  const sessionIds = sessions.map((s) => s.id);
  const completions = sessionIds.length
    ? await db
        .select()
        .from(mobilityCompletions)
        .where(inArray(mobilityCompletions.sessionId, sessionIds))
    : [];

  return (
    <HistoryClient
      sessions={sessions}
      exercises={exercises}
      completions={completions}
    />
  );
}
