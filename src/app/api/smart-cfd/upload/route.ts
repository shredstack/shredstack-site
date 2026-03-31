import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { smartCfdUsers, smartCfdWorkouts } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';
import { parseCSV, extractWorkouts, dedup, dedupKey } from '@/lib/smart-cfd-csv';

export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV file appears empty or malformed' }, { status: 400 });
    }

    const workouts = dedup(extractWorkouts(rows));

    if (workouts.length === 0) {
      return NextResponse.json(
        { error: 'No valid workout rows found. Make sure this is a PushPress score export.' },
        { status: 400 }
      );
    }

    // Get existing workouts for this user to diff
    const existingWorkouts = await db
      .select({
        rawDescription: smartCfdWorkouts.rawDescription,
        rawScore: smartCfdWorkouts.rawScore,
        workoutDate: smartCfdWorkouts.workoutDate,
      })
      .from(smartCfdWorkouts)
      .where(eq(smartCfdWorkouts.userId, session.userId));

    const existingKeys = new Set(
      existingWorkouts.map((w) =>
        dedupKey({
          rawTitle: '',
          rawDescription: w.rawDescription,
          rawScore: w.rawScore,
          rawDivision: '',
          rawNotes: '',
          workoutDate: w.workoutDate,
        })
      )
    );

    // Filter to only truly new workouts
    const newWorkouts = workouts.filter((w) => !existingKeys.has(dedupKey(w)));

    if (newWorkouts.length > 0) {
      // Insert in batches of 50 to avoid query size limits
      const BATCH_SIZE = 50;
      for (let i = 0; i < newWorkouts.length; i += BATCH_SIZE) {
        const batch = newWorkouts.slice(i, i + BATCH_SIZE);
        await db.insert(smartCfdWorkouts).values(
          batch.map((w) => ({
            userId: session.userId,
            rawTitle: w.rawTitle || null,
            rawDescription: w.rawDescription,
            rawScore: w.rawScore,
            rawDivision: w.rawDivision || null,
            rawNotes: w.rawNotes || null,
            workoutDate: w.workoutDate,
          }))
        );
      }
    }

    // Update user record
    await db
      .update(smartCfdUsers)
      .set({
        lastUploadAt: new Date(),
        analysisStatus: 'pending',
        analysisProgress: 0,
      })
      .where(eq(smartCfdUsers.id, session.userId));

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(smartCfdWorkouts)
      .where(eq(smartCfdWorkouts.userId, session.userId));

    return NextResponse.json({
      newWorkoutCount: newWorkouts.length,
      totalWorkoutCount: Number(totalResult[0].count),
      duplicatesSkipped: workouts.length - newWorkouts.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
