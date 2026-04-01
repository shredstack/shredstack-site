import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { crossfitWorkoutCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';

// GET: Return all categories
export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const categories = await db
    .select()
    .from(crossfitWorkoutCategories)
    .orderBy(crossfitWorkoutCategories.parentType, crossfitWorkoutCategories.name);

  return NextResponse.json({ categories });
}

// PATCH: Update a category (rename or reclassify)
export async function PATCH(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, parentType } = body as { id: number; name?: string; parentType?: string };

  if (!id) {
    return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (name) updates.name = name;
  if (parentType) updates.parentType = parentType;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  await db
    .update(crossfitWorkoutCategories)
    .set(updates)
    .where(eq(crossfitWorkoutCategories.id, id));

  return NextResponse.json({ success: true });
}
