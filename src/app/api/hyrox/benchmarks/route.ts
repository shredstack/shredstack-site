import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hyroxStationBenchmarks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';
import { HYROX_STATIONS, SCENARIO_A, SCENARIO_B, type SegmentId } from '@/lib/hyrox-utils';

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all benchmarks for this user, newest first
    const allBenchmarks = await db.select()
      .from(hyroxStationBenchmarks)
      .where(eq(hyroxStationBenchmarks.userId, session.userId))
      .orderBy(desc(hyroxStationBenchmarks.recordedAt));

    // Build current best (latest full-distance) per station
    const current: Record<string, {
      timeSeconds: number;
      recordedAt: Date;
      source: string;
      notes: string | null;
    }> = {};

    // Build full history per station
    const history: Record<string, Array<{
      timeSeconds: number;
      distance: string | null;
      isFullDistance: boolean | null;
      recordedAt: Date;
      source: string;
      notes: string | null;
    }>> = {};

    for (const b of allBenchmarks) {
      // Add to history
      if (!history[b.station]) history[b.station] = [];
      history[b.station].push({
        timeSeconds: b.timeSeconds,
        distance: b.distance,
        isFullDistance: b.isFullDistance,
        recordedAt: b.recordedAt,
        source: b.source,
        notes: b.notes,
      });

      // Set current best if full distance and not yet set (first = latest since sorted desc)
      if (b.isFullDistance && !current[b.station]) {
        current[b.station] = {
          timeSeconds: b.timeSeconds,
          recordedAt: b.recordedAt,
          source: b.source,
          notes: b.notes,
        };
      }
    }

    return NextResponse.json({
      current,
      history,
      targets: {
        scenarioA: SCENARIO_A,
        scenarioB: SCENARIO_B,
      },
    });
  } catch (error) {
    console.error('Benchmarks fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch benchmarks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { station, timeSeconds, notes } = await request.json();

    if (!station || !timeSeconds) {
      return NextResponse.json({ error: 'station and timeSeconds are required' }, { status: 400 });
    }

    const [benchmark] = await db.insert(hyroxStationBenchmarks).values({
      userId: session.userId,
      station,
      timeSeconds,
      isFullDistance: true,
      notes: notes || null,
      source: 'manual',
      recordedAt: new Date(),
    }).returning();

    return NextResponse.json({ benchmark });
  } catch (error) {
    console.error('Benchmark save error:', error);
    return NextResponse.json({ error: 'Failed to save benchmark' }, { status: 500 });
  }
}
