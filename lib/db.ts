mkdir -p lib
cat > lib/db.ts << 'EOF'
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
      // SSL is commonly required on hosted Postgres (Neon/Supabase/etc).
      // For local dev with non-SSL Postgres, this typically still works if server supports it.
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return global.__thoxie_pg_pool;
}
EOF

