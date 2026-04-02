import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { crossfitUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { gender } = body;

  if (gender !== 'female' && gender !== 'male' && gender !== null) {
    return NextResponse.json({ error: 'Gender must be "female", "male", or null' }, { status: 400 });
  }

  await db
    .update(crossfitUsers)
    .set({ gender })
    .where(eq(crossfitUsers.id, session.userId));

  return NextResponse.json({ gender });
}
