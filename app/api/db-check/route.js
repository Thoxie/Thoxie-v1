// /app/api/db-check/route.js
import { NextResponse } from "next/server";
import pg from "pg";

export const runtime = "nodejs"; // required for pg

export async function GET() {
  const url = process.env.POSTGRES_URL || process.env.POSTGRES_DATABASE_URL;

  if (!url) {
    return NextResponse.json({ ok: false, error: "Missing POSTGRES_URL" }, { status: 500 });
  }

  const client = new pg.Client({ connectionString: url });

  try {
    await client.connect();
    await client.query("select 1 as ok");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "DB query failed" },
      { status: 500 }
    );
  } finally {
    try { await client.end(); } catch {}
  }
}
