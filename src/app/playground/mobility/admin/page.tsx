import { db } from '@/db';
import {
  mobilityExercises,
  mobilityExerciseDays,
  mobilityExerciseVideos,
} from '@/db/schema';
import { asc } from 'drizzle-orm';
import { hydrateExercises } from '@/lib/mobility/program';
import AdminClient from './components/AdminClient';

export const dynamic = 'force-dynamic';

export default async function MobilityAdminPage() {
  const [exerciseRows, dayRows, videoRows] = await Promise.all([
    db.select().from(mobilityExercises).orderBy(asc(mobilityExercises.id)),
    db.select().from(mobilityExerciseDays),
    db.select().from(mobilityExerciseVideos),
  ]);
  const exercises = hydrateExercises(exerciseRows, dayRows, videoRows);

  return <AdminClient initialExercises={exercises} />;
}
