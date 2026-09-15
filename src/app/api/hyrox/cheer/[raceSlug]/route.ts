import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, hyroxCheerMarks } from '@/db';
import { getHyroxRace } from '@/lib/hyroxCheer/races';

const MAX_NOTE_LENGTH = 300;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ raceSlug: string }> }
) {
  const { raceSlug } = await params;
  const found = getHyroxRace(raceSlug);
  if (!found) {
    return NextResponse.json({ error: 'Unknown race' }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(hyroxCheerMarks)
    .where(eq(hyroxCheerMarks.raceSlug, raceSlug));

  const marks: Record<number, { markedAt: string | null; note: string | null }> = {};
  for (const row of rows) {
    marks[row.segmentIndex] = {
      markedAt: row.markedAt ? row.markedAt.toISOString() : null,
      note: row.note,
    };
  }

  return NextResponse.json({ marks });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ raceSlug: string }> }
) {
  const { raceSlug } = await params;
  const found = getHyroxRace(raceSlug);
  if (!found) {
    return NextResponse.json({ error: 'Unknown race' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.segmentIndex !== 'number') {
    return NextResponse.json({ error: 'segmentIndex is required' }, { status: 400 });
  }

  const { segmentIndex } = body;
  if (
    !Number.isInteger(segmentIndex) ||
    segmentIndex < 0 ||
    segmentIndex >= found.segments.length
  ) {
    return NextResponse.json({ error: 'segmentIndex out of range' }, { status: 400 });
  }

  let markedAt: Date | null | undefined = undefined;
  if ('markedAt' in body) {
    if (body.markedAt === null) {
      markedAt = null;
    } else {
      const parsed = new Date(body.markedAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid markedAt' }, { status: 400 });
      }
      markedAt = parsed;
    }
  }

  let note: string | null | undefined = undefined;
  if ('note' in body) {
    if (body.note === null) {
      note = null;
    } else if (typeof body.note === 'string') {
      note = body.note.slice(0, MAX_NOTE_LENGTH);
    } else {
      return NextResponse.json({ error: 'Invalid note' }, { status: 400 });
    }
  }

  const existing = await db
    .select({ id: hyroxCheerMarks.id })
    .from(hyroxCheerMarks)
    .where(
      and(
        eq(hyroxCheerMarks.raceSlug, raceSlug),
        eq(hyroxCheerMarks.segmentIndex, segmentIndex)
      )
    );

  if (existing.length > 0) {
    await db
      .update(hyroxCheerMarks)
      .set({
        ...(markedAt !== undefined ? { markedAt } : {}),
        ...(note !== undefined ? { note } : {}),
        updatedAt: new Date(),
      })
      .where(eq(hyroxCheerMarks.id, existing[0].id));
  } else {
    await db.insert(hyroxCheerMarks).values({
      raceSlug,
      segmentIndex,
      markedAt: markedAt ?? null,
      note: note ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Wipes every mark and note for a race — this is the "start over" button behind
 * the test panel. Gated on the same `locked` flag as the test panel itself, so
 * once the race is locked for race day nobody visiting the shared link can
 * clear the board out from under everyone else.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ raceSlug: string }> }
) {
  const { raceSlug } = await params;
  const found = getHyroxRace(raceSlug);
  if (!found) {
    return NextResponse.json({ error: 'Unknown race' }, { status: 404 });
  }
  if (found.race.locked) {
    return NextResponse.json({ error: 'Race is locked' }, { status: 403 });
  }

  await db.delete(hyroxCheerMarks).where(eq(hyroxCheerMarks.raceSlug, raceSlug));

  return NextResponse.json({ ok: true });
}
