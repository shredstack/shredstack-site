import { NextResponse } from 'next/server';
import { db } from '@/db';
import { crossfitUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateInsights, getCachedInsights } from '@/lib/crossfit-insights';

export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [user] = await db
    .select()
    .from(crossfitUsers)
    .where(and(eq(crossfitUsers.publicSlug, slug), eq(crossfitUsers.isPublic, true)))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  }

  try {
    // For public dashboards, always try cached first — only generate if none exists
    const cached = await getCachedInsights(user.id);
    if (cached) {
      return NextResponse.json({
        narrative: cached.narrative,
        generatedAt: cached.generatedAt.toISOString(),
        cached: true,
      });
    }

    // Generate and cache if no cached version exists
    const narrative = await generateInsights(user.id);
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
