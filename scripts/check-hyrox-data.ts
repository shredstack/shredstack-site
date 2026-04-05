import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

async function check() {
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const rows = await sql`SELECT count(*) as cnt FROM hyrox_training_plans`;
  console.log('Training plan rows:', rows[0].cnt);
  const users = await sql`SELECT id, email FROM crossfit_users`;
  console.log('Users:', users);
  const plans = await sql`SELECT user_id, count(*) as cnt FROM hyrox_training_plans GROUP BY user_id`;
  console.log('Plans by user:', plans);
}

check().catch(console.error);
