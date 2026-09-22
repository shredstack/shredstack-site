import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

async function check() {
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const rows = await sql`SELECT * FROM hyrox_cheer_race_state WHERE race_slug = 'slc-2026'`;
  console.log(JSON.stringify(rows, null, 2));
}

check().catch(console.error);
