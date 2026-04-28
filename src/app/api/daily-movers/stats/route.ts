import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyMoversSessions } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';
import { getCycleWeekFor, weekdayDatesOf } from '@/lib/daily-movers/program';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Returns Mon=0..Sun=6.
function isoWeekdayIndex(dateStr: string): number {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return (day + 6) % 7;
}

function previousWeekday(dateStr: string): string {
  // Walk back day by day until we hit Mon-Thu (skipping Fri-Sun).
  const ts = new Date(`${dateStr}T00:00:00Z`).getTime();
  let prev = ts - MS_PER_DAY;
  while (true) {
    const d = new Date(prev).toISOString().slice(0, 10);
    if (isoWeekdayIndex(d) <= 3) return d;
    prev -= MS_PER_DAY;
  }
}

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allLogs = await db
      .select({
        loggedDate: dailyMoversSessions.loggedDate,
        slot: dailyMoversSessions.slot,
      })
      .from(dailyMoversSessions)
      .where(
        and(
          eq(dailyMoversSessions.userId, session.userId),
          isNull(dailyMoversSessions.deletedAt),
        ),
      );

    const stretchDates = new Set(
      allLogs.filter((l) => l.slot === 'stretch').map((l) => l.loggedDate),
    );

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const todayWeekday = isoWeekdayIndex(todayStr);

    // Current streak: walk back from the most recent Mon-Thu (inclusive of today
    // if today is Mon-Thu) and count consecutive stretch logs. Skip weekends.
    // If today is Fri-Sun, start from the previous Thursday.
    let cursor = todayWeekday <= 3 ? todayStr : previousWeekday(todayStr);
    let currentStreak = 0;
    // Allow today to be unfinished — if today is a weekday and not yet logged,
    // start counting from the previous weekday so we don't punish mid-day visits.
    if (todayWeekday <= 3 && !stretchDates.has(cursor)) {
      cursor = previousWeekday(cursor);
    }
    while (stretchDates.has(cursor)) {
      currentStreak += 1;
      cursor = previousWeekday(cursor);
    }

    // Longest streak: scan all stretch dates, sorted, counting consecutive
    // weekday-adjacent runs.
    const sortedStretch = Array.from(stretchDates).sort();
    let longestStreak = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of sortedStretch) {
      if (isoWeekdayIndex(d) > 3) continue; // ignore stray weekend logs
      if (prev !== null && previousWeekday(d) === prev) {
        run += 1;
      } else {
        run = 1;
      }
      if (run > longestStreak) longestStreak = run;
      prev = d;
    }

    // This week count: any non-deleted log in current Mon-Thu (training, core, or stretch).
    // Target stays at 8 (4 days × training+stretch). Core is optional bonus —
    // logging it pushes count above target, which is fine.
    const weekDates = new Set(weekdayDatesOf(today));
    const thisWeekCount = allLogs.filter((l) => weekDates.has(l.loggedDate)).length;

    const totalSessions = allLogs.length;
    const currentCycleWeek = getCycleWeekFor(today);

    return NextResponse.json({
      currentStreak,
      longestStreak,
      thisWeekCount,
      thisWeekTarget: 8,
      totalSessions,
      currentCycleWeek,
    });
  } catch (error) {
    console.error('Daily movers stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
