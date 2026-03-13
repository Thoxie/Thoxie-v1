/* PATH: app/_lib/server/ensureSchema.js */
/* FILE: ensureSchema.js */
/* ACTION: FULL OVERWRITE */

const SCHEMA_SQL = `
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
  extracted_text text not null default '',
  extraction_method text not null default '',
  ocr_status text not null default ''
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

alter table thoxie_document
  add column if not exists extraction_method text not null default '';

alter table thoxie_document
  add column if not exists ocr_status text not null default '';

create index if not exists idx_thoxie_document_case_id
  on thoxie_document(case_id);

create index if not exists idx_thoxie_document_uploaded_at
  on thoxie_document(uploaded_at desc);

create table if not exists thoxie_document_chunk (
  chunk_id text primary key,
  case_id text not null references thoxie_case(case_id) on delete cascade,
  doc_id text not null references thoxie_document(doc_id) on delete cascade,
  chunk_index integer not null,
  chunk_text text not null default '',
  created_at timestamptz not null default now()
);

alter table thoxie_document_chunk
  add column if not exists case_id text;

alter table thoxie_document_chunk
  add column if not exists doc_id text;

alter table thoxie_document_chunk
  add column if not exists chunk_index integer;

alter table thoxie_document_chunk
  add column if not exists chunk_text text not null default '';

alter table thoxie_document_chunk
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists idx_thoxie_document_chunk_doc_idx
  on thoxie_document_chunk(doc_id, chunk_index);

create index if not exists idx_thoxie_document_chunk_case_id
  on thoxie_document_chunk(case_id);

create index if not exists idx_thoxie_document_chunk_doc_id
  on thoxie_document_chunk(doc_id);
`;

let schemaReadyPromise = null;

export async function ensureSchema(pool) {
  if (!pool) {
    throw new Error("Missing database pool");
  }

  if (!schemaReadyPromise) {
    schemaReadyPromise = pool.query(SCHEMA_SQL).catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }

  await schemaReadyPromise;
}

export { SCHEMA_SQL };
