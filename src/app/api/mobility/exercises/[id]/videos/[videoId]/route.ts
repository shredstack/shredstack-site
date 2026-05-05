import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mobilityExerciseVideos } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> },
) {
  try {
    const { id, videoId } = await params;
    const exerciseId = Number(id);
    const vId = Number(videoId);
    if (!Number.isInteger(exerciseId) || !Number.isInteger(vId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const [row] = await db
      .delete(mobilityExerciseVideos)
      .where(
        and(
          eq(mobilityExerciseVideos.id, vId),
          eq(mobilityExerciseVideos.exerciseId, exerciseId),
        ),
      )
      .returning({ id: mobilityExerciseVideos.id });
    if (!row) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Mobility video delete error:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> },
) {
  try {
    const { id, videoId } = await params;
    const exerciseId = Number(id);
    const vId = Number(videoId);
    if (!Number.isInteger(exerciseId) || !Number.isInteger(vId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const body = await request.json();
    const { label, sortOrder } = body ?? {};
    const updates: Record<string, unknown> = {};
    if (typeof label === 'string') updates.label = label.trim() === '' ? null : label.trim();
    else if (label === null) updates.label = null;
    if (Number.isInteger(sortOrder)) updates.sortOrder = sortOrder;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 });
    }
    const [row] = await db
      .update(mobilityExerciseVideos)
      .set(updates)
      .where(
        and(
          eq(mobilityExerciseVideos.id, vId),
          eq(mobilityExerciseVideos.exerciseId, exerciseId),
        ),
      )
      .returning();
    if (!row) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    return NextResponse.json({ video: row });
  } catch (error) {
    console.error('Mobility video update error:', error);
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
  }
}
