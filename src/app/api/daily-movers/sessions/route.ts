import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyMoversSessions } from '@/db/schema';
import { and, eq, gte, lte, isNull, sql } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';
import { isValidIsoDate, isValidSlot } from '@/lib/daily-movers/program';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!isValidIsoDate(start) || !isValidIsoDate(end)) {
      return NextResponse.json(
        { error: 'start and end must be YYYY-MM-DD dates' },
        { status: 400 },
      );
    }

    const rows = await db
      .select()
      .from(dailyMoversSessions)
      .where(
        and(
          eq(dailyMoversSessions.userId, session.userId),
          gte(dailyMoversSessions.loggedDate, start),
          lte(dailyMoversSessions.loggedDate, end),
          isNull(dailyMoversSessions.deletedAt),
        ),
      );

    return NextResponse.json({
      sessions: rows.map((r) => ({
        id: r.id,
        loggedDate: r.loggedDate,
        cycleWeek: r.cycleWeek,
        slot: r.slot,
        completedAt: r.completedAt,
        notes: r.notes,
      })),
    });
  } catch (error) {
    console.error('Daily movers sessions fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { loggedDate, cycleWeek, slot, notes } = body ?? {};

    if (!isValidIsoDate(loggedDate)) {
      return NextResponse.json({ error: 'loggedDate must be YYYY-MM-DD' }, { status: 400 });
    }
    if (!Number.isInteger(cycleWeek) || cycleWeek < 1 || cycleWeek > 4) {
      return NextResponse.json({ error: 'cycleWeek must be 1-4' }, { status: 400 });
    }
    if (!isValidSlot(slot)) {
      return NextResponse.json(
        { error: 'slot must be training, core, or stretch' },
        { status: 400 },
      );
    }

    // Reject dates more than 30 days in the past or 7 days in the future.
    const now = Date.now();
    const ts = new Date(`${loggedDate}T00:00:00Z`).getTime();
    if (ts < now - 30 * MS_PER_DAY || ts > now + 7 * MS_PER_DAY) {
      return NextResponse.json(
        { error: 'loggedDate is out of allowed range' },
        { status: 400 },
      );
    }

    const completedAt = new Date();

    // Upsert on (user_id, logged_date, slot). Reactivates a soft-deleted row by clearing deleted_at.
    const [row] = await db
      .insert(dailyMoversSessions)
      .values({
        userId: session.userId,
        loggedDate,
        cycleWeek,
        slot,
        completedAt,
        notes: typeof notes === 'string' ? notes : null,
      })
      .onConflictDoUpdate({
        target: [
          dailyMoversSessions.userId,
          dailyMoversSessions.loggedDate,
          dailyMoversSessions.slot,
        ],
        set: {
          cycleWeek,
          completedAt,
          notes: typeof notes === 'string' ? notes : null,
          deletedAt: sql`NULL`,
          updatedAt: completedAt,
        },
      })
      .returning();

    return NextResponse.json({
      session: {
        id: row.id,
        loggedDate: row.loggedDate,
        cycleWeek: row.cycleWeek,
        slot: row.slot,
        completedAt: row.completedAt,
        notes: row.notes,
      },
    });
  } catch (error) {
    console.error('Daily movers session log error:', error);
    return NextResponse.json({ error: 'Failed to log session' }, { status: 500 });
  }
}
