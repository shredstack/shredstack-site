import { NextRequest, NextResponse } from 'next/server';
import { db, cfdDashboards } from '@/db';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, data } = body;

    if (!name || !data) {
      return NextResponse.json(
        { error: 'Name and data are required' },
        { status: 400 }
      );
    }

    // Sanitize name into a URL-friendly slug
    const cleanName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanName) {
      return NextResponse.json(
        { error: 'Name must contain at least one letter or number' },
        { status: 400 }
      );
    }

    // Build slug: name_YYYYMMDD
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const slug = `${cleanName}_${dateStr}`;

    // Validate data is parseable JSON
    try {
      JSON.parse(data);
    } catch {
      return NextResponse.json(
        { error: 'Invalid dashboard data' },
        { status: 400 }
      );
    }

    // Upsert: if slug exists, update it
    const existing = await db
      .select()
      .from(cfdDashboards)
      .where(eq(cfdDashboards.slug, slug));

    if (existing.length > 0) {
      await db
        .update(cfdDashboards)
        .set({ data, displayName: name.trim() })
        .where(eq(cfdDashboards.slug, slug));
    } else {
      await db.insert(cfdDashboards).values({
        slug,
        displayName: name.trim(),
        data,
      });
    }

    return NextResponse.json(
      { slug, message: 'Dashboard saved!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('CFD dashboard save error:', error);
    return NextResponse.json(
      { error: 'Failed to save dashboard. Please try again.' },
      { status: 500 }
    );
  }
}
