import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  crossfitUsers,
  crossfitWorkouts,
  crossfitUserScores,
  crossfitMovements,
  crossfitUserMovementPerformance,
  crossfitWorkoutMovements,
  crossfitWorkoutCategories,
} from '@/db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';
import { buildDashboardResponse } from '@/lib/crossfit-dashboard';

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db
    .select()
    .from(crossfitUsers)
    .where(eq(crossfitUsers.id, session.userId))
    .limit(1);

  if (user.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const data = await buildDashboardResponse(session.userId, user[0], true);
  return NextResponse.json(data);
}
