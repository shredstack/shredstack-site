import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/smart-cfd-auth';
import { generateInsights, getCachedInsights } from '@/lib/smart-cfd-insights';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const regenerate = request.nextUrl.searchParams.get('regenerate') === 'true';
  const checkOnly = request.nextUrl.searchParams.get('checkOnly') === 'true';

  try {
    // Check for cached insights first
    if (!regenerate) {
      const cached = await getCachedInsights(session.userId);
      if (cached) {
        return NextResponse.json({
          narrative: cached.narrative,
          generatedAt: cached.generatedAt.toISOString(),
          cached: true,
        });
      }
      // If only checking, return empty result without generating
      if (checkOnly) {
        return NextResponse.json({ narrative: null, cached: false });
      }
    }

    // Generate fresh insights
    const narrative = await generateInsights(session.userId);
    return NextResponse.json({
      narrative,
      generatedAt: new Date().toISOString(),
      cached: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate insights';
    const status = message === 'No workout data found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
