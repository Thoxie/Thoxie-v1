// FILE: app/api/db-init/route.ts
import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SQL = `
create table if not exists thoxie_case (
  case_id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists thoxie_document (
  doc_id text primary key,
  case_id text not null references thoxie_case(case_id) on delete cascade,
  name text not null,
  mime_type text,
  size_bytes bigint,
  doc_type text,
  exhibit_description text,
  blob_url text,
  uploaded_at timestamptz not null default now(),
  extracted_text text not null default ''
);

create index if not exists idx_thoxie_document_case_id on thoxie_document(case_id);
`;

export async function GET() {
  const pool = getPool();
  try {
    await pool.query(SQL);
    return NextResponse.json({
      ok: true,
      tables: ["thoxie_case", "thoxie_document"],
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
