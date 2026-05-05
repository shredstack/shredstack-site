import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mobilityExercises } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    // Cascade-deletes mobility_completions referencing this exercise (FK ON DELETE CASCADE).
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
