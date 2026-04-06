import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hyroxSessionLogs, hyroxStationBenchmarks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const sessionId = Number(id);
    const body = await request.json();

    // Verify ownership
    const [existing] = await db.select()
      .from(hyroxSessionLogs)
      .where(and(
        eq(hyroxSessionLogs.id, sessionId),
        eq(hyroxSessionLogs.userId, session.userId),
      ));

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const [updated] = await db.update(hyroxSessionLogs)
      .set({
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        sessionType: body.sessionType || undefined,
        actualDurationMin: body.actualDurationMin ?? undefined,
        notes: body.notes ?? undefined,
        rpe: body.rpe ?? undefined,
        runPace: body.runPace ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(hyroxSessionLogs.id, sessionId))
      .returning();

    // Replace station benchmarks if provided
    if (body.stationBenchmarks) {
      // Delete existing benchmarks for this session
      await db.delete(hyroxStationBenchmarks)
        .where(eq(hyroxStationBenchmarks.sessionLogId, sessionId));

      // Insert new benchmarks
      if (body.stationBenchmarks.length > 0) {
        await db.insert(hyroxStationBenchmarks).values(
          body.stationBenchmarks.map((b: { station: string; timeSeconds: number; distance: string | null; isFullDistance: boolean; notes: string | null }) => ({
            userId: session.userId,
            sessionLogId: sessionId,
            station: b.station,
            timeSeconds: b.timeSeconds,
            distance: b.distance,
            isFullDistance: b.isFullDistance,
            notes: b.notes,
            source: 'manual',
            recordedAt: new Date(),
          }))
        );
      }
    }

    return NextResponse.json({ sessionLog: updated });
  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const sessionId = Number(id);

    // Verify ownership
    const [existing] = await db.select()
      .from(hyroxSessionLogs)
      .where(and(
        eq(hyroxSessionLogs.id, sessionId),
        eq(hyroxSessionLogs.userId, session.userId),
      ));

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Station benchmarks will cascade-delete via FK
    await db.delete(hyroxSessionLogs)
      .where(eq(hyroxSessionLogs.id, sessionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session delete error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
