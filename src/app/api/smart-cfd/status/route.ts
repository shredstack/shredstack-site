import { NextResponse } from 'next/server';
import { db } from '@/db';
import { smartCfdUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db
    .select({
      analysisStatus: smartCfdUsers.analysisStatus,
      analysisProgress: smartCfdUsers.analysisProgress,
    })
    .from(smartCfdUsers)
    .where(eq(smartCfdUsers.id, session.userId))
    .limit(1);

  if (user.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: user[0].analysisStatus,
    progress: user[0].analysisProgress,
  });
}
