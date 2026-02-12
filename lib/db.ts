// Path: /lib/db.ts
import { Pool } from "pg";

/**
 * Uses DATABASE_URL (recommended on Vercel).
 * Uses a singleton Pool to avoid exhausting connections in serverless.
 */
declare global {
  // eslint-disable-next-line no-var
  var __thoxie_pg_pool: Pool | undefined;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }
  return url;
}

export function getPool(): Pool {
  if (!global.__thoxie_pg_pool) {
    global.__thoxie_pg_pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000
    });
  }
  return global.__thoxie_pg_pool;
}
