import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  mobilityExercises,
  mobilityExerciseDays,
} from '@/db/schema';
import { and, eq, max, notInArray } from 'drizzle-orm';
import { normalizeDaysArray } from '@/lib/mobility/program';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const exerciseId = Number(id);
    if (!Number.isInteger(exerciseId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Cascade-deletes mobility_completions, mobility_exercise_days, and
    // mobility_exercise_videos referencing this exercise (FK ON DELETE CASCADE).
    const [row] = await db
      .delete(mobilityExercises)
      .where(eq(mobilityExercises.id, exerciseId))
      .returning({ id: mobilityExercises.id });

    if (!row) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Mobility exercise delete error:', error);
    return NextResponse.json({ error: 'Failed to delete exercise' }, { status: 500 });
  }
}

// PATCH /api/mobility/exercises/[id]
// Body: { days: number[] }  // overwrite the day assignment for a rotational exercise.
// Existing day links not in the new set are removed (cascading their orderInDay).
// New day links are appended at MAX(orderInDay)+1 within that day.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const exerciseId = Number(id);
    if (!Number.isInteger(exerciseId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json();
    const { days } = body ?? {};
    const normalized = normalizeDaysArray(days);
    if (!normalized) {
      return NextResponse.json(
        { error: 'days must be a non-empty array containing 1, 2, or 3' },
        { status: 400 },
      );
    }

    const [exercise] = await db
      .select({ id: mobilityExercises.id, category: mobilityExercises.category })
      .from(mobilityExercises)
      .where(eq(mobilityExercises.id, exerciseId))
      .limit(1);
    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }
    if (exercise.category !== 'exercise') {
      return NextResponse.json(
        { error: 'days can only be assigned to rotational exercises' },
        { status: 400 },
      );
    }

    const existingLinks = await db
      .select()
      .from(mobilityExerciseDays)
      .where(eq(mobilityExerciseDays.exerciseId, exerciseId));
    const existingDays = new Set(existingLinks.map((l) => l.day));

    // Delete links for days that are no longer wanted.
    await db
      .delete(mobilityExerciseDays)
      .where(
        and(
          eq(mobilityExerciseDays.exerciseId, exerciseId),
          notInArray(mobilityExerciseDays.day, normalized),
        ),
      );

    // Insert links for newly added days, each appended to its day's section.
    for (const day of normalized) {
      if (existingDays.has(day)) continue;
      const [maxRow] = await db
        .select({ max: max(mobilityExerciseDays.orderInDay) })
        .from(mobilityExerciseDays)
        .where(eq(mobilityExerciseDays.day, day));
      const nextOrder = (maxRow?.max ?? 0) + 1;
      await db.insert(mobilityExerciseDays).values({
        exerciseId,
        day,
        orderInDay: nextOrder,
      });
    }

    const updatedLinks = await db
      .select()
      .from(mobilityExerciseDays)
      .where(eq(mobilityExerciseDays.exerciseId, exerciseId));

    const orderByDay: Record<number, number> = {};
    for (const l of updatedLinks) orderByDay[l.day] = l.orderInDay;
    const sortedDays = updatedLinks.map((l) => l.day).sort((a, b) => a - b);

    return NextResponse.json({ days: sortedDays, orderByDay });
  } catch (error) {
    console.error('Mobility exercise days update error:', error);
    return NextResponse.json({ error: 'Failed to update days' }, { status: 500 });
  }
}
