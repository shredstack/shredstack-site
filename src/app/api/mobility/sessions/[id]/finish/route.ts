import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mobilityCompletions, mobilitySessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionId = Number(id);
    if (!Number.isInteger(sessionId)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
    }

    const completions = await db
      .select({ id: mobilityCompletions.id })
      .from(mobilityCompletions)
      .where(eq(mobilityCompletions.sessionId, sessionId));

    if (completions.length === 0) {
      return NextResponse.json(
        { error: 'Cannot finish a session with no completed exercises' },
        { status: 400 },
      );
    }

    const [row] = await db
      .update(mobilitySessions)
      .set({ completedAt: new Date() })
      .where(eq(mobilitySessions.id, sessionId))
      .returning();

    if (!row) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session: row });
  } catch (error) {
    console.error('Mobility session finish error:', error);
    return NextResponse.json({ error: 'Failed to finish session' }, { status: 500 });
  }
}
