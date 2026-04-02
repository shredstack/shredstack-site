import { NextResponse } from 'next/server';
import { db } from '@/db';
import { crossfitUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';
import { processAnalysisChunk } from '@/lib/crossfit-analysis';

export const maxDuration = 60; // Vercel Pro plan: 60s timeout

export async function POST() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user gender for score analysis
    const user = await db
      .select({ gender: crossfitUsers.gender })
      .from(crossfitUsers)
      .where(eq(crossfitUsers.id, session.userId))
      .limit(1);

    const result = await processAnalysisChunk(session.userId, 20, user[0]?.gender);

    return NextResponse.json({
      processed: result.processed,
      remaining: result.remaining,
      total: result.total,
      done: result.remaining <= 0,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
