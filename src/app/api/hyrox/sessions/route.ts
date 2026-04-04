import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hyroxSessionLogs, hyroxStationBenchmarks } from '@/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

export async function GET(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 50;
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const logs = await db.select()
      .from(hyroxSessionLogs)
      .where(eq(hyroxSessionLogs.userId, session.userId))
      .orderBy(desc(hyroxSessionLogs.completedAt))
      .limit(limit);

    // Apply filters in JS (simpler than building dynamic where clauses)
    let filtered = logs;
    if (type) {
      filtered = filtered.filter(l => l.sessionType === type);
    }
    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter(l => l.completedAt >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      filtered = filtered.filter(l => l.completedAt <= toDate);
    }

    return NextResponse.json({ sessions: filtered });
  } catch (error) {
    console.error('Sessions fetch error:', error);
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
    const {
      planSessionId,
      completedAt,
      sessionType,
      actualDurationMin,
      notes,
      rpe,
      runPace,
      stationBenchmarks,
    } = body;

    if (!sessionType || !completedAt) {
      return NextResponse.json({ error: 'sessionType and completedAt are required' }, { status: 400 });
    }

    // Insert session log
    const [sessionLog] = await db.insert(hyroxSessionLogs).values({
      userId: session.userId,
      planSessionId: planSessionId || null,
      completedAt: new Date(completedAt),
      sessionType,
      actualDurationMin: actualDurationMin || null,
      notes: notes || null,
      rpe: rpe || null,
      runPace: runPace || null,
    }).returning();

    // Insert station benchmarks if provided
    if (stationBenchmarks && Array.isArray(stationBenchmarks) && stationBenchmarks.length > 0) {
      await db.insert(hyroxStationBenchmarks).values(
        stationBenchmarks.map((b: {
          station: string;
          timeSeconds: number;
          distance?: string;
          isFullDistance?: boolean;
          notes?: string;
        }) => ({
          userId: session.userId,
          sessionLogId: sessionLog.id,
          station: b.station,
          timeSeconds: b.timeSeconds,
          distance: b.distance || null,
          isFullDistance: b.isFullDistance ?? true,
          notes: b.notes || null,
          source: sessionType,
          recordedAt: new Date(completedAt),
        }))
      );
    }

    return NextResponse.json({ sessionLog });
  } catch (error) {
    console.error('Session log error:', error);
    return NextResponse.json({ error: 'Failed to log session' }, { status: 500 });
  }
}
