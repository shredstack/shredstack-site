import { db } from '@/db';
import { mobilityExercises } from '@/db/schema';
import { asc } from 'drizzle-orm';
import AdminClient from './components/AdminClient';

export const dynamic = 'force-dynamic';

export default async function MobilityAdminPage() {
  const exercises = await db
    .select()
    .from(mobilityExercises)
    .orderBy(asc(mobilityExercises.day), asc(mobilityExercises.orderInDay));

  return <AdminClient initialExercises={exercises} />;
}
