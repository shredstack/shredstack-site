/**
 * Replaces the spectator-entered marks on the SLC 2026 cheer card with Sarah's
 * actual splits from her official HYROX result (hyresult.com), now that the
 * race is over and the live board is no longer being marked in real time.
 *
 * Segment -> mark mapping follows how slc2026.ts bundles Roxzone time: a run
 * segment's mark is the "Rox In" timestamp (arrival at the next station), and
 * a station segment's mark is the "Rox Out" timestamp (departure after work +
 * roxzone). Run 8 has no separate roxzone row, so its mark is "Wall Balls In".
 * Wall Balls (the finish) is marked at the official finish time.
 *
 * Usage: npx tsx scripts/update-hyrox-cheer-marks-slc2026.ts
 * Requires: NEON_DATABASE_URL env var (.env.local)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';

const sql = neon(process.env.NEON_DATABASE_URL!);
const db = drizzle(sql, { schema });

const RACE_SLUG = 'slc-2026';

// Time of day (America/Denver, MDT = UTC-6) each segment was completed, per
// Sarah's official splits at https://www.hyresult.com/result/LR3MS4JI588B9C
const MARKS: { segmentIndex: number; name: string; markedAt: string }[] = [
  { segmentIndex: 0, name: 'Run 1', markedAt: '2026-09-18T15:52:26-06:00' },
  { segmentIndex: 1, name: 'SkiErg', markedAt: '2026-09-18T15:58:56-06:00' },
  { segmentIndex: 2, name: 'Run 2', markedAt: '2026-09-18T16:03:29-06:00' },
  { segmentIndex: 3, name: 'Sled Push', markedAt: '2026-09-18T16:07:19-06:00' },
  { segmentIndex: 4, name: 'Run 3', markedAt: '2026-09-18T16:11:54-06:00' },
  { segmentIndex: 5, name: 'Sled Pull', markedAt: '2026-09-18T16:17:36-06:00' },
  { segmentIndex: 6, name: 'Run 4', markedAt: '2026-09-18T16:21:57-06:00' },
  { segmentIndex: 7, name: 'Burpee Broad Jumps', markedAt: '2026-09-18T16:27:35-06:00' },
  { segmentIndex: 8, name: 'Run 5', markedAt: '2026-09-18T16:32:00-06:00' },
  { segmentIndex: 9, name: 'Row', markedAt: '2026-09-18T16:38:07-06:00' },
  { segmentIndex: 10, name: 'Run 6', markedAt: '2026-09-18T16:42:31-06:00' },
  { segmentIndex: 11, name: 'Farmers Carry', markedAt: '2026-09-18T16:45:32-06:00' },
  { segmentIndex: 12, name: 'Run 7', markedAt: '2026-09-18T16:50:01-06:00' },
  { segmentIndex: 13, name: 'Sandbag Lunges', markedAt: '2026-09-18T16:56:03-06:00' },
  { segmentIndex: 14, name: 'Run 8', markedAt: '2026-09-18T17:00:19-06:00' },
  { segmentIndex: 15, name: 'Wall Balls (finish, 1:15:48)', markedAt: '2026-09-18T17:05:49-06:00' },
];

async function run() {
  let inserted = 0;
  let updated = 0;

  for (const mark of MARKS) {
    const markedAt = new Date(mark.markedAt);

    const existing = await db
      .select({ id: schema.hyroxCheerMarks.id })
      .from(schema.hyroxCheerMarks)
      .where(
        and(
          eq(schema.hyroxCheerMarks.raceSlug, RACE_SLUG),
          eq(schema.hyroxCheerMarks.segmentIndex, mark.segmentIndex)
        )
      );

    if (existing.length > 0) {
      await db
        .update(schema.hyroxCheerMarks)
        .set({ markedAt, updatedAt: new Date() })
        .where(eq(schema.hyroxCheerMarks.id, existing[0].id));
      updated++;
    } else {
      await db.insert(schema.hyroxCheerMarks).values({
        raceSlug: RACE_SLUG,
        segmentIndex: mark.segmentIndex,
        markedAt,
      });
      inserted++;
    }
    console.log(`  [${mark.segmentIndex}] ${mark.name}: ${mark.markedAt}`);
  }

  console.log(`Done! Inserted: ${inserted}, Updated: ${updated}, Total: ${MARKS.length}`);
}

run().catch(console.error);
