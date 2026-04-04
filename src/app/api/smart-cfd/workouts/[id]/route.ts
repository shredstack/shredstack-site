import { NextResponse } from 'next/server';
import { db } from '@/db';
import { crossfitWorkouts, crossfitWorkoutCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const workoutId = parseInt(id);
  if (isNaN(workoutId)) {
    return NextResponse.json({ error: 'Invalid workout ID' }, { status: 400 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if ('categoryId' in body) {
    updates.categoryId = body.categoryId;
  }

  if ('isMonthlyChallenge' in body) {
    updates.isMonthlyChallenge = body.isMonthlyChallenge;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  await db
    .update(crossfitWorkouts)
    .set(updates)
    .where(eq(crossfitWorkouts.id, workoutId));

  // Fetch updated workout to return category name
  const updated = await db
    .select({
      id: crossfitWorkouts.id,
      categoryId: crossfitWorkouts.categoryId,
      isMonthlyChallenge: crossfitWorkouts.isMonthlyChallenge,
    })
    .from(crossfitWorkouts)
    .where(eq(crossfitWorkouts.id, workoutId))
    .limit(1);

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
  }

  // Get category name
  let categoryName: string | null = null;
  if (updated[0].categoryId) {
    const cat = await db
      .select({ name: crossfitWorkoutCategories.name })
      .from(crossfitWorkoutCategories)
      .where(eq(crossfitWorkoutCategories.id, updated[0].categoryId))
      .limit(1);
    categoryName = cat[0]?.name ?? null;
  }

  return NextResponse.json({
    id: updated[0].id,
    categoryId: updated[0].categoryId,
    category: categoryName,
    isMonthlyChallenge: updated[0].isMonthlyChallenge,
  });
}
