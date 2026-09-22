/**
 * Backfills how much of each station split was the actual station work (reps),
 * as opposed to roxzone/queue time, from Sarah's official HYROX result splits
 * (https://www.hyresult.com/result/LR3MS4JI588B9C?tab=splits).
 *
 * This is a one-time backfill for a finished race, not a general feature:
 * spectators have no reliable way to mark "work start" vs "work end" live
 * during a race, so `work_seconds` is only ever set here, after the fact, from
 * an official result. Segments not listed below (all runs, plus Burpee Broad
 * Jumps) are left untouched — see the script's comment on Burpee BJ for why.
 *
 * Usage: ENV_FILE=.env.production.local npx tsx scripts/backfill-hyrox-cheer-work-seconds.ts
 * Requires: NEON_DATABASE_URL env var
 */

import dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_FILE || '.env.local' });
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';

const sql = neon(process.env.NEON_DATABASE_URL!);
const db = drizzle(sql, { schema });

const RACE_SLUG = 'slc-2026';

// Station "X In" -> "X Out" duration from the official splits table, in
// seconds. Burpee Broad Jumps (segmentIndex 7) is deliberately excluded: its
// mat readout was "In" 16:22:27 -> "Out" 16:22:32, six seconds, which is not
// physically possible for 80m of burpee broad jumps. That's a timing-mat
// artifact (a known HYROX quirk on distance stations), not real data, so that
// segment keeps its combined total-only split instead of a fabricated
// work/roxzone breakdown.
const WORK_SECONDS: { segmentIndex: number; name: string; seconds: number }[] = [
  { segmentIndex: 1, name: 'SkiErg', seconds: 5 * 60 + 4 },
  { segmentIndex: 3, name: 'Sled Push', seconds: 2 * 60 + 20 },
  { segmentIndex: 5, name: 'Sled Pull', seconds: 5 * 60 + 8 },
  { segmentIndex: 9, name: 'Row', seconds: 5 * 60 },
  { segmentIndex: 11, name: 'Farmers Carry', seconds: 2 * 60 + 3 },
  { segmentIndex: 13, name: 'Sandbag Lunges', seconds: 4 * 60 + 53 },
  // Last station of the race — she crosses the finish line straight out of
  // Wall Balls, so there's no roxzone after it. Work seconds = the full split.
  { segmentIndex: 15, name: 'Wall Balls', seconds: 5 * 60 + 30 },
];

async function run() {
  for (const row of WORK_SECONDS) {
    const existing = await db
      .select({ id: schema.hyroxCheerMarks.id })
      .from(schema.hyroxCheerMarks)
      .where(
        and(
          eq(schema.hyroxCheerMarks.raceSlug, RACE_SLUG),
          eq(schema.hyroxCheerMarks.segmentIndex, row.segmentIndex)
        )
      );
    if (existing.length === 0) {
      console.error(`  [${row.segmentIndex}] ${row.name}: no existing mark row — skipped`);
      continue;
    }
    await db
      .update(schema.hyroxCheerMarks)
      .set({ workSeconds: row.seconds, updatedAt: new Date() })
      .where(eq(schema.hyroxCheerMarks.id, existing[0].id));
    console.log(`  [${row.segmentIndex}] ${row.name}: workSeconds=${row.seconds}`);
  }
  console.log('Done!');
}

run().catch(console.error);
