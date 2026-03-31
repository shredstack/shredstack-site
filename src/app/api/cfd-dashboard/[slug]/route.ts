import { NextRequest, NextResponse } from 'next/server';
import { db, cfdDashboards } from '@/db';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const results = await db
      .select()
      .from(cfdDashboards)
      .where(eq(cfdDashboards.slug, slug));

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(results[0]);
  } catch (error) {
    console.error('CFD dashboard fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard.' },
      { status: 500 }
    );
  }
}
