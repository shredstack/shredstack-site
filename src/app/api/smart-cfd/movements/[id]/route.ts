import { NextResponse } from 'next/server';
import { db } from '@/db';
import { crossfitMovements } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

const VALID_CATEGORIES = [
  'barbell', 'dumbbell', 'kettlebell', 'gymnastics',
  'bodyweight', 'monostructural', 'accessory', 'other',
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const movementId = parseInt(id);
  if (isNaN(movementId)) {
    return NextResponse.json({ error: 'Invalid movement ID' }, { status: 400 });
  }

  const body = await request.json();

  if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  await db
    .update(crossfitMovements)
    .set({ movementType: body.category })
    .where(eq(crossfitMovements.id, movementId));

  return NextResponse.json({ id: movementId, category: body.category });
}
