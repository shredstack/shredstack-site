import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

async function check() {
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const rows = await sql`
    SELECT segment_index, marked_at, note, updated_at
    FROM hyrox_cheer_marks
    WHERE race_slug = 'slc-2026'
    ORDER BY segment_index
  `;
  console.log(JSON.stringify(rows, null, 2));
}

check().catch(console.error);
