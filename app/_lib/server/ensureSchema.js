// PATH: /app/_lib/server/ensureSchema.js
// DIRECTORY: /app/_lib/server
// FILE: ensureSchema.js
// ACTION: FULL OVERWRITE

const SCHEMA_SQL = `
create table if not exists thoxie_case (
  case_id text primary key,
  owner_token_hash text,
  owner_claimed_at timestamptz,
  owner_last_seen_at timestamptz,
  case_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table thoxie_case
  add column if not exists owner_token_hash text;

alter table thoxie_case
  add column if not exists owner_claimed_at timestamptz;

alter table thoxie_case
  add column if not exists owner_last_seen_at timestamptz;

alter table thoxie_case
  add column if not exists case_data jsonb not null default '{}'::jsonb;

alter table thoxie_case
  add column if not exists created_at timestamptz not null default now();

alter table thoxie_case
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_thoxie_case_updated_at
  on thoxie_case(updated_at desc);

create index if not exists idx_thoxie_case_owner_token_hash
  on thoxie_case(owner_token_hash);

create table if not exists thoxie_document (
  doc_id text primary key,
  case_id text not null references thoxie_case(case_id) on delete cascade,
  name text not null default '',
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  doc_type text not null default 'evidence',
  exhibit_description text not null default '',
  evidence_category text not null default '',
  evidence_supports jsonb not null default '[]'::jsonb,
  blob_url text,
  uploaded_at timestamptz not null default now(),
  extracted_text text not null default '',
  extraction_method text not null default '',
  ocr_status text not null default '',
  ocr_job_id text not null default '',
  ocr_provider text not null default '',
  ocr_requested_at timestamptz,
  ocr_completed_at timestamptz,
  ocr_error text not null default ''
);

alter table thoxie_document
  add column if not exists case_id text;

alter table thoxie_document
  add column if not exists name text not null default '';

alter table thoxie_document
  add column if not exists mime_type text not null default '';

alter table thoxie_document
  add column if not exists size_bytes bigint not null default 0;

alter table thoxie_document
  add column if not exists doc_type text not null default 'evidence';

alter table thoxie_document
  add column if not exists exhibit_description text not null default '';

alter table thoxie_document
  add column if not exists evidence_category text not null default '';

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

alter table thoxie_document
  add column if not exists ocr_job_id text not null default '';

alter table thoxie_document
  add column if not exists ocr_provider text not null default '';

alter table thoxie_document
  add column if not exists ocr_requested_at timestamptz;

alter table thoxie_document
  add column if not exists ocr_completed_at timestamptz;

alter table thoxie_document
  add column if not exists ocr_error text not null default '';

create index if not exists idx_thoxie_document_case_id
  on thoxie_document(case_id);

create index if not exists idx_thoxie_document_uploaded_at
  on thoxie_document(uploaded_at desc);

create index if not exists idx_thoxie_document_ocr_status
  on thoxie_document(ocr_status);

create index if not exists idx_thoxie_document_ocr_job_id
  on thoxie_document(ocr_job_id);

create table if not exists thoxie_document_chunk (
  chunk_id text primary key,
  case_id text not null references thoxie_case(case_id) on delete cascade,
  doc_id text not null references thoxie_document(doc_id) on delete cascade,
  chunk_index integer not null,
  chunk_text text not null default '',
  chunk_kind text not null default '',
  chunk_label text not null default '',
  section_label text not null default '',
  page_start integer,
  page_end integer,
  char_start integer,
  char_end integer,
  structural_flags jsonb not null default '[]'::jsonb,
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
  add column if not exists chunk_kind text not null default '';

alter table thoxie_document_chunk
  add column if not exists chunk_label text not null default '';

alter table thoxie_document_chunk
  add column if not exists section_label text not null default '';

alter table thoxie_document_chunk
  add column if not exists page_start integer;

alter table thoxie_document_chunk
  add column if not exists page_end integer;

alter table thoxie_document_chunk
  add column if not exists char_start integer;

alter table thoxie_document_chunk
  add column if not exists char_end integer;

alter table thoxie_document_chunk
  add column if not exists structural_flags jsonb not null default '[]'::jsonb;

alter table thoxie_document_chunk
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists idx_thoxie_document_chunk_doc_idx
  on thoxie_document_chunk(doc_id, chunk_index);

create index if not exists idx_thoxie_document_chunk_case_id
  on thoxie_document_chunk(case_id);

create index if not exists idx_thoxie_document_chunk_doc_id
  on thoxie_document_chunk(doc_id);

create index if not exists idx_thoxie_document_chunk_page_start
  on thoxie_document_chunk(page_start);

create index if not exists idx_thoxie_document_chunk_chunk_kind
  on thoxie_document_chunk(chunk_kind);
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
