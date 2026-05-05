import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mobilityCompletions, mobilitySessions } from '@/db/schema';
import { desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { isValidDay, localIsoDate } from '@/lib/mobility/program';

// GET /api/mobility/sessions
//   ?active=1  -> the most recent in-progress session (completedAt IS NULL), or null
//   ?last=1    -> the most recent completed session (for rotation hint), or null
//   default    -> last 60 sessions with completion counts (history view)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const last = searchParams.get('last');

    if (active === '1') {
      const rows = await db
        .select()
        .from(mobilitySessions)
        .where(isNull(mobilitySessions.completedAt))
        .orderBy(desc(mobilitySessions.startedAt))
        .limit(1);
      return NextResponse.json({ session: rows[0] ?? null });
    }

    if (last === '1') {
      const rows = await db
        .select()
        .from(mobilitySessions)
        .where(isNotNull(mobilitySessions.completedAt))
        .orderBy(desc(mobilitySessions.startedAt))
        .limit(1);
      return NextResponse.json({ session: rows[0] ?? null });
    }

    const sessions = await db
      .select()
      .from(mobilitySessions)
      .orderBy(desc(mobilitySessions.startedAt))
      .limit(60);

    if (sessions.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    const ids = sessions.map((s) => s.id);
    const completions = await db
      .select({
        sessionId: mobilityCompletions.sessionId,
        exerciseId: mobilityCompletions.exerciseId,
      })
      .from(mobilityCompletions)
      .where(inArray(mobilityCompletions.sessionId, ids));

    const byId = new Map<number, number[]>();
    for (const c of completions) {
      const list = byId.get(c.sessionId) ?? [];
      list.push(c.exerciseId);
      byId.set(c.sessionId, list);
    }

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        ...s,
        completedExerciseIds: byId.get(s.id) ?? [],
      })),
    });
  } catch (error) {
    console.error('Mobility sessions fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST /api/mobility/sessions
// Body: { day: 1|2|3, force?: boolean }
//   - If an active session exists with the same day, return it.
//   - If an active session exists with a different day:
//       - force=true → discard old session (cascade-deletes completions) and start fresh
//       - else → return 409 with the active session
//   - Otherwise, create a new session for today with the given day.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { day, force } = body ?? {};

    if (!isValidDay(day)) {
      return NextResponse.json({ error: 'day must be 1, 2, or 3' }, { status: 400 });
    }

    const active = await getActiveSession();
    if (active) {
      if (active.day === day) {
        return NextResponse.json({ session: active, created: false });
      }
      if (!force) {
        return NextResponse.json(
          { error: 'Active session exists for a different day', session: active },
          { status: 409 },
        );
      }
      await db.delete(mobilitySessions).where(eq(mobilitySessions.id, active.id));
    }

    const [row] = await db
      .insert(mobilitySessions)
      .values({
        day,
        sessionDate: localIsoDate(),
      })
      .returning();

    return NextResponse.json({ session: row, created: true });
  } catch (error) {
    console.error('Mobility session create error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

async function getActiveSession() {
  const rows = await db
    .select()
    .from(mobilitySessions)
    .where(isNull(mobilitySessions.completedAt))
    .orderBy(desc(mobilitySessions.startedAt))
    .limit(1);
  return rows[0] ?? null;
}
