import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
import { SEGMENTS, RACE } from '../src/lib/hyroxCheer/races/slc2026';

function formatMinSec(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

async function main() {
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const rows = await sql`
    SELECT segment_index, marked_at
    FROM hyrox_cheer_marks
    WHERE race_slug = 'slc-2026'
    ORDER BY segment_index
  `;
  const marks: Record<number, string> = {};
  for (const r of rows as any[]) marks[r.segment_index] = r.marked_at;

  const startInstant = new Date(RACE.startISO);
  let prevMs = startInstant.getTime();
  for (let i = 0; i < SEGMENTS.length; i++) {
    const iso = marks[i];
    if (!iso) {
      console.log(`[${i}] ${SEGMENTS[i].name}: NO MARK`);
      continue;
    }
    const markedInstant = new Date(iso);
    const splitSec = (markedInstant.getTime() - prevMs) / 1000;
    console.log(`[${i}] ${SEGMENTS[i].name}: split=${formatMinSec(splitSec)} (markedAt=${iso})`);
    prevMs = markedInstant.getTime();
  }
}

main().catch(console.error);
