import { NextResponse } from "next/server";
import { Client } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickConnectionString() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL
  );
}

export async function GET() {
  const connectionString = pickConnectionString();

  if (!connectionString) {
    return NextResponse.json(
      { ok: false, error: "No database connection string found." },
      { status: 500 }
    );
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query("select 1 as ok");
    await client.end();

    return NextResponse.json({
      ok: true,
      result: result.rows[0],
      node: process.version,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
