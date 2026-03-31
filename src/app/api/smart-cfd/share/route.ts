import { NextResponse } from 'next/server';
import { db } from '@/db';
import { smartCfdUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';
import { randomBytes } from 'crypto';

function generateSlug(): string {
  return randomBytes(4).toString('hex'); // 8-char hex string
}

// GET: Check current share status
export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db
    .select()
    .from(smartCfdUsers)
    .where(eq(smartCfdUsers.id, session.userId))
    .limit(1);

  if (user.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    isPublic: user[0].isPublic,
    publicSlug: user[0].publicSlug,
  });
}

// POST: Toggle sharing on/off
export async function POST() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db
    .select()
    .from(smartCfdUsers)
    .where(eq(smartCfdUsers.id, session.userId))
    .limit(1);

  if (user.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const currentlyPublic = user[0].isPublic;

  if (currentlyPublic) {
    // Turn off sharing
    await db
      .update(smartCfdUsers)
      .set({ isPublic: false })
      .where(eq(smartCfdUsers.id, session.userId));

    return NextResponse.json({ isPublic: false, publicSlug: user[0].publicSlug });
  } else {
    // Turn on sharing — generate slug if needed
    const slug = user[0].publicSlug || generateSlug();
    await db
      .update(smartCfdUsers)
      .set({ isPublic: true, publicSlug: slug })
      .where(eq(smartCfdUsers.id, session.userId));

    return NextResponse.json({ isPublic: true, publicSlug: slug });
  }
}
