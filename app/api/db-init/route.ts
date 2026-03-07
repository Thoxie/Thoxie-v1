/* FILE: app/api/db-init/route.ts */
/* ACTION: FULL OVERWRITE EXISTING FILE */

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

alter table thoxie_case
  add column if not exists case_data jsonb not null default '{}'::jsonb;

alter table thoxie_case
  add column if not exists created_at timestamptz not null default now();

alter table thoxie_case
  add column if not exists updated_at timestamptz not null default now();

create table if not exists thoxie_document (
  doc_id text primary key,
  case_id text not null references thoxie_case(case_id) on delete cascade,
  name text not null,
  mime_type text,
  size_bytes bigint,
  doc_type text,
  exhibit_description text,
  evidence_category text,
  evidence_supports jsonb not null default '[]'::jsonb,
  blob_url text,
  uploaded_at timestamptz not null default now(),
  extracted_text text not null default ''
);

alter table thoxie_document
  add column if not exists case_id text;

alter table thoxie_document
  add column if not exists name text;

alter table thoxie_document
  add column if not exists mime_type text;

alter table thoxie_document
  add column if not exists size_bytes bigint;

alter table thoxie_document
  add column if not exists doc_type text;

alter table thoxie_document
  add column if not exists exhibit_description text;

alter table thoxie_document
  add column if not exists evidence_category text;

alter table thoxie_document
  add column if not exists evidence_supports jsonb not null default '[]'::jsonb;

alter table thoxie_document
  add column if not exists blob_url text;

alter table thoxie_document
  add column if not exists uploaded_at timestamptz not null default now();

alter table thoxie_document
  add column if not exists extracted_text text not null default '';

create index if not exists idx_thoxie_document_case_id
  on thoxie_document(case_id);

create index if not exists idx_thoxie_document_uploaded_at
  on thoxie_document(uploaded_at desc);
`;

export async function GET() {
  const pool = getPool();

  try {
    await pool.query(SQL);

    const columns = await pool.query(
      `
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('thoxie_case', 'thoxie_document')
      order by table_name, ordinal_position
      `
    );

    return NextResponse.json({
      ok: true,
      tables: ["thoxie_case", "thoxie_document"],
      columns: columns.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("DB INIT ERROR:", err);

    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
