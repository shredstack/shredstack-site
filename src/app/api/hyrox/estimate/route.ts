import { NextResponse } from 'next/server';
import { db } from '@/db';
import { hyroxStationBenchmarks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';
import { calculateEstimate, type SegmentId } from '@/lib/hyrox-utils';

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all full-distance benchmarks, newest first
    const allBenchmarks = await db.select()
      .from(hyroxStationBenchmarks)
      .where(eq(hyroxStationBenchmarks.userId, session.userId))
      .orderBy(desc(hyroxStationBenchmarks.recordedAt));

    // Get latest full-distance time per station
    const latestByStation: Partial<Record<SegmentId, number>> = {};
    for (const b of allBenchmarks) {
      const stationId = b.station as SegmentId;
      if (b.isFullDistance && !latestByStation[stationId]) {
        latestByStation[stationId] = b.timeSeconds;
      }
    }

    const estimate = calculateEstimate(latestByStation);

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Estimate error:', error);
    return NextResponse.json({ error: 'Failed to calculate estimate' }, { status: 500 });
  }
}
