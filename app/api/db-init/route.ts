/* FILE: app/api/db-init/route.ts */

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SQL = `
create table if not exists thoxie_case (
  case_id text primary key,
  case_data jsonb not null default '{}'::jsonb,
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

create index if not exists idx_thoxie_document_case
on thoxie_document(case_id);
`;

export async function GET() {
  const pool = getPool();

  try {
    await pool.query(SQL);

    return NextResponse.json({
      success: true,
      message: "Database initialized"
    });
  } catch (error) {
    console.error("DB INIT ERROR:", error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
