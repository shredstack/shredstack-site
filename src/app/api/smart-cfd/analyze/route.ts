import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/smart-cfd-auth';
import { processAnalysisChunk } from '@/lib/crossfit-analysis';

export const maxDuration = 60; // Vercel Pro plan: 60s timeout

export async function POST() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processAnalysisChunk(session.userId);

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
