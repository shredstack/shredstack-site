import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { crossfitUsers, crossfitWorkouts, crossfitUserScores } from '@/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { verifySession } from '@/lib/smart-cfd-auth';
import { processCSVUpload, type ProcessedWorkoutRow } from '@/lib/crossfit-csv';

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
    const { rows, totalParsed, duplicatesRemoved } = processCSVUpload(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid workout rows found. Make sure this is a PushPress score export.' },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------------
    // Stage 2a: Match incoming rows against existing workouts by hash
    // ---------------------------------------------------------------
    const uniqueHashes = [...new Set(rows.map((r) => r.descriptionHash))];

    // Look up which hashes already have workout records
    const existingWorkouts = await db
      .select({ id: crossfitWorkouts.id, descriptionHash: crossfitWorkouts.descriptionHash })
      .from(crossfitWorkouts)
      .where(inArray(crossfitWorkouts.descriptionHash, uniqueHashes));

    const hashToWorkoutId = new Map(existingWorkouts.map((w) => [w.descriptionHash, w.id]));

    // Create workout records for new hashes (first occurrence provides raw fields)
    const newHashRows = new Map<string, ProcessedWorkoutRow>();
    for (const row of rows) {
      if (!hashToWorkoutId.has(row.descriptionHash) && !newHashRows.has(row.descriptionHash)) {
        newHashRows.set(row.descriptionHash, row);
      }
    }

    let newWorkoutCount = 0;
    if (newHashRows.size > 0) {
      const BATCH_SIZE = 50;
      const newWorkoutEntries = [...newHashRows.values()];
      for (let i = 0; i < newWorkoutEntries.length; i += BATCH_SIZE) {
        const batch = newWorkoutEntries.slice(i, i + BATCH_SIZE);
        const inserted = await db
          .insert(crossfitWorkouts)
          .values(
            batch.map((row) => ({
              descriptionHash: row.descriptionHash,
              rawTitle: row.rawTitle || null,
              rawDescription: row.rawDescription,
              isMonthlyChallenge: row.isLikelyChallenge,
            }))
          )
          .returning({ id: crossfitWorkouts.id, descriptionHash: crossfitWorkouts.descriptionHash });

        for (const w of inserted) {
          hashToWorkoutId.set(w.descriptionHash, w.id);
        }
        newWorkoutCount += inserted.length;
      }
    }

    // ---------------------------------------------------------------
    // Stage 2b: Dedup scores against existing user scores in the DB
    // ---------------------------------------------------------------
    // Get this user's existing scores to skip duplicates
    const existingScores = await db
      .select({
        workoutId: crossfitUserScores.workoutId,
        workoutDate: crossfitUserScores.workoutDate,
      })
      .from(crossfitUserScores)
      .where(eq(crossfitUserScores.userId, session.userId));

    const existingScoreKeys = new Set(
      existingScores.map((s) => {
        const dateStr = s.workoutDate.toISOString().split('T')[0];
        return `${s.workoutId}|${dateStr}`;
      })
    );

    // Filter to only truly new scores
    const newScoreRows = rows.filter((row) => {
      const workoutId = hashToWorkoutId.get(row.descriptionHash);
      if (!workoutId) return false; // shouldn't happen
      const dateStr = row.workoutDate.toISOString().split('T')[0];
      return !existingScoreKeys.has(`${workoutId}|${dateStr}`);
    });

    // ---------------------------------------------------------------
    // Insert user scores
    // ---------------------------------------------------------------
    let newScoreCount = 0;
    if (newScoreRows.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < newScoreRows.length; i += BATCH_SIZE) {
        const batch = newScoreRows.slice(i, i + BATCH_SIZE);
        await db.insert(crossfitUserScores).values(
          batch.map((row) => ({
            userId: session.userId,
            workoutId: hashToWorkoutId.get(row.descriptionHash)!,
            workoutDate: row.workoutDate,
            rawScore: row.rawScore,
            rawDivision: row.rawDivision || null,
            rawNotes: row.rawNotes || null,
          }))
        );
        newScoreCount += batch.length;
      }
    }

    // ---------------------------------------------------------------
    // Update user record
    // ---------------------------------------------------------------
    await db
      .update(crossfitUsers)
      .set({
        lastUploadAt: new Date(),
        analysisStatus: 'pending',
        analysisProgress: 0,
      })
      .where(eq(crossfitUsers.id, session.userId));

    // Get total score count for this user
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(crossfitUserScores)
      .where(eq(crossfitUserScores.userId, session.userId));

    const monthlyChallengesDetected = rows.filter((r) => r.isLikelyChallenge).length;
    const dbDuplicatesSkipped = rows.length - newScoreRows.length;

    return NextResponse.json({
      newScoreCount,
      newWorkoutCount,
      duplicatesSkipped: duplicatesRemoved + dbDuplicatesSkipped,
      monthlyChallengesDetected,
      totalScoreCount: Number(totalResult[0].count),
    });
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
