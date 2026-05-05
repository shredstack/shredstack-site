import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mobilityExercises } from '@/db/schema';
import { and, asc, eq, isNull, max } from 'drizzle-orm';
import {
  isDailyCategory,
  isValidCategory,
  isValidDay,
  type MobilityCategory,
} from '@/lib/mobility/program';

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(mobilityExercises)
      .orderBy(asc(mobilityExercises.day), asc(mobilityExercises.orderInDay));

    return NextResponse.json({ exercises: rows });
  } catch (error) {
    console.error('Mobility exercises fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });
  }
}

// POST /api/mobility/exercises
// Body: { category: MobilityCategory, day?: 1|2|3, name?: string, setsReps?: string }
//   - If category is daily (stretch / recovery_at_athlecare), day must be omitted/null.
//   - Otherwise day must be 1, 2, or 3.
//   - orderInDay is auto-assigned to MAX+1 within the (day, category) bucket.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, day, name, setsReps } = body ?? {};

    if (!isValidCategory(category)) {
      return NextResponse.json(
        { error: 'category must be one of: exercise, stretch, recovery_at_athlecare' },
        { status: 400 },
      );
    }

    const cat = category as MobilityCategory;
    const isDaily = isDailyCategory(cat);

    let dayValue: number | null;
    if (isDaily) {
      if (day !== undefined && day !== null) {
        return NextResponse.json(
          { error: 'day must be omitted for stretches and recovery items' },
          { status: 400 },
        );
      }
      dayValue = null;
    } else {
      if (!isValidDay(day)) {
        return NextResponse.json(
          { error: 'day must be 1, 2, or 3 for exercises' },
          { status: 400 },
        );
      }
      dayValue = day;
    }

    // Compute next order_in_day within (day, category) bucket.
    const dayFilter =
      dayValue === null
        ? isNull(mobilityExercises.day)
        : eq(mobilityExercises.day, dayValue);
    const [maxRow] = await db
      .select({ max: max(mobilityExercises.orderInDay) })
      .from(mobilityExercises)
      .where(and(dayFilter, eq(mobilityExercises.category, cat)));
    const nextOrder = (maxRow?.max ?? 0) + 1;

    const trimmedName = typeof name === 'string' && name.trim() !== '' ? name.trim() : 'New item';
    const trimmedSetsReps =
      typeof setsReps === 'string' && setsReps.trim() !== '' ? setsReps.trim() : null;

    const [row] = await db
      .insert(mobilityExercises)
      .values({
        day: dayValue,
        orderInDay: nextOrder,
        category: cat,
        name: trimmedName,
        setsReps: trimmedSetsReps,
      })
      .returning();

    return NextResponse.json({ exercise: row });
  } catch (error) {
    console.error('Mobility exercise create error:', error);
    return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, setsReps, notes, videoUrl, videoFilename } = body ?? {};

    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: 'id must be an integer' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof name === 'string') updates.name = name;
    if (typeof setsReps === 'string' || setsReps === null) updates.setsReps = setsReps;
    if (typeof notes === 'string' || notes === null) updates.notes = notes;
    if (typeof videoUrl === 'string' || videoUrl === null) updates.videoUrl = videoUrl;
    if (typeof videoFilename === 'string' || videoFilename === null) {
      updates.videoFilename = videoFilename;
    }

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
