import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.NEON_DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL environment variable is not set');
}

const sql = neon(process.env.NEON_DATABASE_URL);
export const db = drizzle(sql, { schema });

// Re-export schema types for convenience
export * from './schema';
