import { NextResponse } from 'next/server';
import { db } from '@/db';
import { crossfitUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { buildDashboardResponse } from '@/lib/crossfit-dashboard';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const user = await db
    .select()
    .from(crossfitUsers)
    .where(and(eq(crossfitUsers.publicSlug, slug), eq(crossfitUsers.isPublic, true)))
    .limit(1);

  if (user.length === 0) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  }

  const data = await buildDashboardResponse(user[0].id, user[0], false);
  return NextResponse.json(data);
}
