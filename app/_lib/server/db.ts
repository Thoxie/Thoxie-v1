// FILE: app/_lib/server/db.ts
import { Pool } from "pg";

export const runtime = "nodejs";

declare global {
  // eslint-disable-next-line no-var
  var __thoxiePgPool: Pool | undefined;
}

function getConnectionString(): string {
  const cs =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!cs) {
    throw new Error(
      "No database connection string found. Expected POSTGRES_URL_NON_POOLING or POSTGRES_DATABASE_URL or POSTGRES_URL or DATABASE_URL."
    );
  }
  return cs;
}

export function getPool(): Pool {
  if (!global.__thoxiePgPool) {
    global.__thoxiePgPool = new Pool({
      connectionString: getConnectionString(),
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return global.__thoxiePgPool;
}
