import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, hyroxCheerRaceState } from '@/db';
import { getHyroxRace } from '@/lib/hyroxCheer/races';
import { checkStartOverride } from '@/lib/hyroxCheer/startOverride';
import { testModeActive } from '@/lib/hyroxCheer/testMode';

/**
 * The real gun time, when the wave doesn't go off on schedule.
 *
 * Deliberately NOT gated behind test mode, unlike ?start= and the DELETE wipe.
 * A late wave is a race-day problem and this is the race-day fix — if it shut
 * off two hours before the gun like everything else, it would be dead exactly
 * when it is needed. What stands in for that gate is checkStartOverride: the
 * new gun has to be within a few minutes before to a few hours after the
 * scheduled one, and only on race day itself.
 *
 * The board has no accounts, so anyone with the link can set this, the same way
 * anyone with the link can mark a segment. The protection against a careless
 * tap is the two-step confirm in the UI; the protection against a silly value
 * is the bounds check here. Both are recoverable — POST {"startAt": null} puts
 * the scheduled time back.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  if (!body || !('startAt' in body)) {
    return NextResponse.json({ error: 'startAt is required' }, { status: 400 });
  }

  let startOverrideAt: Date | null = null;
  if (body.startAt !== null) {
    if (typeof body.startAt !== 'string') {
      return NextResponse.json({ error: 'Invalid startAt' }, { status: 400 });
    }
    const parsed = new Date(body.startAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid startAt' }, { status: 400 });
    }
    startOverrideAt = parsed;
  }

  // Real wall clock, never a client-supplied one — this is the check that keeps
  // the window honest, so nothing about it may come from the request.
  const check = checkStartOverride(
    new Date(found.race.startISO).getTime(),
    startOverrideAt === null ? null : startOverrideAt.getTime(),
    Date.now(),
    // While the race is still unlocked and days out, the race-day window would
    // make this untestable. The offset bounds still apply either way.
    { ignoreWindow: testModeActive(found.race) }
  );
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 403 });
  }

  const existing = await db
    .select({ id: hyroxCheerRaceState.id })
    .from(hyroxCheerRaceState)
    .where(eq(hyroxCheerRaceState.raceSlug, raceSlug));

  if (existing.length > 0) {
    await db
      .update(hyroxCheerRaceState)
      .set({ startOverrideAt, updatedAt: new Date() })
      .where(eq(hyroxCheerRaceState.id, existing[0].id));
  } else {
    await db.insert(hyroxCheerRaceState).values({ raceSlug, startOverrideAt });
  }

  return NextResponse.json({
    ok: true,
    startOverrideAt: startOverrideAt ? startOverrideAt.toISOString() : null,
  });
}
