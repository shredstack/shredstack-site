import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  mobilityExercises,
  mobilityExerciseDays,
  mobilityExerciseVideos,
} from '@/db/schema';
import { asc, eq, max } from 'drizzle-orm';
import {
  hydrateExercises,
  isDailyCategory,
  isValidCategory,
  normalizeDaysArray,
  type MobilityCategory,
} from '@/lib/mobility/program';

export async function GET() {
  try {
    const [exerciseRows, dayRows, videoRows] = await Promise.all([
      db.select().from(mobilityExercises).orderBy(asc(mobilityExercises.id)),
      db.select().from(mobilityExerciseDays),
      db.select().from(mobilityExerciseVideos),
    ]);
    const exercises = hydrateExercises(exerciseRows, dayRows, videoRows);
    return NextResponse.json({ exercises });
  } catch (error) {
    console.error('Mobility exercises fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });
  }
}

// POST /api/mobility/exercises
// Body:
//   { category: 'exercise', days: number[], name?, setsReps? }
//   { category: 'stretch' | 'recovery_at_athlecare', name?, setsReps? }
// For rotational exercises, days[] is the set of days (1/2/3) the exercise appears on.
// orderInDay is auto-assigned per day to MAX+1 within that day.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, days, name, setsReps } = body ?? {};

    if (!isValidCategory(category)) {
      return NextResponse.json(
        { error: 'category must be one of: exercise, stretch, recovery_at_athlecare' },
        { status: 400 },
      );
    }

    const cat = category as MobilityCategory;
    const isDaily = isDailyCategory(cat);

    let dayList: number[] = [];
    if (isDaily) {
      if (days !== undefined && days !== null) {
        return NextResponse.json(
          { error: 'days must be omitted for stretches and recovery items' },
          { status: 400 },
        );
      }
    } else {
      const normalized = normalizeDaysArray(days);
      if (!normalized) {
        return NextResponse.json(
          { error: 'days must be a non-empty array containing 1, 2, or 3' },
          { status: 400 },
        );
      }
      dayList = normalized;
    }

    const trimmedName = typeof name === 'string' && name.trim() !== '' ? name.trim() : 'New item';
    const trimmedSetsReps =
      typeof setsReps === 'string' && setsReps.trim() !== '' ? setsReps.trim() : null;

    // For non-rotational items, orderInDay is the order within their category section.
    let exerciseOrderInDay = 1;
    if (isDaily) {
      const [maxRow] = await db
        .select({ max: max(mobilityExercises.orderInDay) })
        .from(mobilityExercises)
        .where(eq(mobilityExercises.category, cat));
      exerciseOrderInDay = (maxRow?.max ?? 0) + 1;
    }

    const [row] = await db
      .insert(mobilityExercises)
      .values({
        orderInDay: exerciseOrderInDay,
        category: cat,
        name: trimmedName,
        setsReps: trimmedSetsReps,
      })
      .returning();

    // Insert per-day links for rotational exercises.
    const dayLinks = [];
    for (const day of dayList) {
      const [maxRow] = await db
        .select({ max: max(mobilityExerciseDays.orderInDay) })
        .from(mobilityExerciseDays)
        .where(eq(mobilityExerciseDays.day, day));
      const nextOrder = (maxRow?.max ?? 0) + 1;
      const [link] = await db
        .insert(mobilityExerciseDays)
        .values({ exerciseId: row.id, day, orderInDay: nextOrder })
        .returning();
      dayLinks.push(link);
    }

    const [hydrated] = hydrateExercises([row], dayLinks, []);
    return NextResponse.json({ exercise: hydrated });
  } catch (error) {
    console.error('Mobility exercise create error:', error);
    return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, setsReps, notes } = body ?? {};

    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: 'id must be an integer' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof name === 'string') updates.name = name;
    if (typeof setsReps === 'string' || setsReps === null) updates.setsReps = setsReps;
    if (typeof notes === 'string' || notes === null) updates.notes = notes;

    const [row] = await db
      .update(mobilityExercises)
      .set(updates)
      .where(eq(mobilityExercises.id, id))
      .returning();

    if (!row) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    return NextResponse.json({ exercise: row });
  } catch (error) {
    console.error('Mobility exercise update error:', error);
    return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 });
  }
}

