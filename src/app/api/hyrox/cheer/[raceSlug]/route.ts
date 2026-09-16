import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, hyroxCheerMarks, hyroxCheerRaceState } from '@/db';
import { getHyroxRace } from '@/lib/hyroxCheer/races';
import { testModeActive } from '@/lib/hyroxCheer/testMode';

const MAX_NOTE_LENGTH = 300;

// Every spectator's browser polls GET every 5 seconds and expects to see marks
// other people just made. Nothing here may ever be cached or prerendered, or
// the whole board freezes at whatever it contained when the response was cached.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ raceSlug: string }> }
) {
  const { raceSlug } = await params;
  const found = getHyroxRace(raceSlug);
  if (!found) {
    return NextResponse.json({ error: 'Unknown race' }, { status: 404 });
  }

  const [rows, stateRows] = await Promise.all([
    db.select().from(hyroxCheerMarks).where(eq(hyroxCheerMarks.raceSlug, raceSlug)),
    db
      .select({ startOverrideAt: hyroxCheerRaceState.startOverrideAt })
      .from(hyroxCheerRaceState)
      .where(eq(hyroxCheerRaceState.raceSlug, raceSlug)),
  ]);

  const marks: Record<number, { markedAt: string | null; note: string | null }> = {};
  for (const row of rows) {
    marks[row.segmentIndex] = {
      markedAt: row.markedAt ? row.markedAt.toISOString() : null,
      note: row.note,
    };
  }

  // Rides along with the marks rather than sitting on its own endpoint: every
  // spectator's browser already polls this every 5 seconds, so a corrected gun
  // reaches every phone on the same tick a mark would, with no extra request.
  const startOverrideAt = stateRows[0]?.startOverrideAt ?? null;

  return NextResponse.json({
    marks,
    startOverrideAt: startOverrideAt ? startOverrideAt.toISOString() : null,
  });
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
 * Wipes every mark and note for a race, and puts the gun back to the scheduled
 * time — the "start over" button behind the test panel. Testing only: once
 * `testModeActive` goes false (the race is
 * locked, or the gun is close enough that the marks are real race data) the
 * only way to erase a board is a code change or direct database access. That
 * is deliberate — these splits are meant to live here permanently.
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
  // Real wall clock on purpose: ?now= is a client-side override, so simulating
  // race time while testing days out still wipes fine, but on the actual day
  // this refuses no matter what any page thinks the time is.
  if (!testModeActive(found.race)) {
    return NextResponse.json(
      { error: 'This board can no longer be wiped' },
      { status: 403 }
    );
  }

  await Promise.all([
    db.delete(hyroxCheerMarks).where(eq(hyroxCheerMarks.raceSlug, raceSlug)),
    db.delete(hyroxCheerRaceState).where(eq(hyroxCheerRaceState.raceSlug, raceSlug)),
  ]);

  return NextResponse.json({ ok: true });
}
