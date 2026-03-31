import { NextResponse } from 'next/server';
import { db } from '@/db';
import { smartCfdUsers, smartCfdWorkouts, smartCfdMovements } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

export async function POST() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Delete movements first (FK constraint)
  await db.delete(smartCfdMovements).where(eq(smartCfdMovements.userId, session.userId));

  // Clear AI analysis fields but keep raw workout data
  await db
    .update(smartCfdWorkouts)
    .set({
      workoutType: null,
      scoreType: null,
      category: null,
      similarityCluster: null,
      aiSummary: null,
      aiAnalysis: null,
    })
    .where(eq(smartCfdWorkouts.userId, session.userId));

  // Reset user status
  await db
    .update(smartCfdUsers)
    .set({
      analysisStatus: 'pending',
      analysisProgress: 0,
    })
    .where(eq(smartCfdUsers.id, session.userId));

  return NextResponse.json({ message: 'Analysis reset. Raw workout data preserved.' });
}
