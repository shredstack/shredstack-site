import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mobilityCompletions, mobilitySessions } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

// POST /api/mobility/completions
// Body: { sessionId: number, exerciseId: number, completed: boolean }
// completed=true  -> upsert (idempotent)
// completed=false -> delete the row
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, exerciseId, completed } = body ?? {};

    if (!Number.isInteger(sessionId) || !Number.isInteger(exerciseId)) {
      return NextResponse.json(
        { error: 'sessionId and exerciseId must be integers' },
        { status: 400 },
      );
    }
    if (typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'completed must be boolean' }, { status: 400 });
    }

    // Reject toggles against an already-finished session.
    const [session] = await db
      .select({ id: mobilitySessions.id, completedAt: mobilitySessions.completedAt })
      .from(mobilitySessions)
      .where(and(eq(mobilitySessions.id, sessionId), isNull(mobilitySessions.completedAt)))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or already finished' },
        { status: 404 },
      );
    }

    if (completed) {
      await db
        .insert(mobilityCompletions)
        .values({ sessionId, exerciseId })
        .onConflictDoNothing({
          target: [mobilityCompletions.sessionId, mobilityCompletions.exerciseId],
        });
    } else {
      await db
        .delete(mobilityCompletions)
        .where(
          and(
            eq(mobilityCompletions.sessionId, sessionId),
            eq(mobilityCompletions.exerciseId, exerciseId),
          ),
        );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Mobility completion toggle error:', error);
    return NextResponse.json({ error: 'Failed to toggle completion' }, { status: 500 });
  }
}
