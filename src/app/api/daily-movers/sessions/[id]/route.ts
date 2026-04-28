import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyMoversSessions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const sessionId = Number(id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(dailyMoversSessions)
      .where(
        and(
          eq(dailyMoversSessions.id, sessionId),
          eq(dailyMoversSessions.userId, session.userId),
        ),
      );

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const now = new Date();
    await db
      .update(dailyMoversSessions)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(dailyMoversSessions.id, sessionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Daily movers session delete error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
