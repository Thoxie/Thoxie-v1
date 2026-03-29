// PATH: /app/_lib/server/caseService.js
// DIRECTORY: /app/_lib/server
// FILE: caseService.js
// ACTION: FULL OVERWRITE

import { createHash, randomBytes } from "node:crypto";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";

export const OWNER_COOKIE_NAME = "thoxie_owner_v1";
export const OWNER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

const OWNER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,200}$/;
const OWNER_HASH_PATTERN = /^[a-f0-9]{64}$/;

function normalizeCaseId(caseId) {
  return String(caseId || "").trim();
}

function normalizeCaseData(caseId, caseData) {
  const source = caseData && typeof caseData === "object" && !Array.isArray(caseData)
    ? caseData
    : {};

  const normalizedId = normalizeCaseId(source.id) || normalizeCaseId(caseId);

  return {
    ...source,
    id: normalizedId,
  };
}

function normalizeOwnerHash(ownerTokenHash) {
  const value = String(ownerTokenHash || "").trim().toLowerCase();
  return OWNER_HASH_PATTERN.test(value) ? value : "";
}

function toPublicCaseRow(row) {
  if (!row) return null;

  return {
    case_id: row.case_id,
    case_data: row.case_data,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeOwnerToken(token) {
  const value = String(token || "").trim();
  return OWNER_TOKEN_PATTERN.test(value) ? value : "";
}

export function createOwnerToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOwnerToken(token) {
  const normalized = normalizeOwnerToken(token);

  if (!normalized) {
    return "";
  }

  return createHash("sha256").update(normalized).digest("hex");
}

export function getOwnerTokenFromRequest(req) {
  return normalizeOwnerToken(req?.cookies?.get?.(OWNER_COOKIE_NAME)?.value);
}

export function getOwnerTokenHashFromRequest(req) {
  return hashOwnerToken(getOwnerTokenFromRequest(req));
}

export function isOwnershipConflictError(error) {
  return error?.code === "CASE_OWNERSHIP_CONFLICT";
}

export async function getCaseRecord(caseId) {
  const normalizedCaseId = normalizeCaseId(caseId);
  if (!normalizedCaseId) return null;

  const pool = getPool();
  await ensureSchema(pool);

  const result = await pool.query(
    `
    select
      case_id,
      owner_token_hash,
      owner_claimed_at,
      owner_last_seen_at,
      case_data,
      created_at,
      updated_at
    from thoxie_case
    where case_id = $1
    limit 1
    `,
    [normalizedCaseId]
  );

  return result.rows[0] || null;
}

export async function getCase(caseId) {
  const row = await getCaseRecord(caseId);
  return toPublicCaseRow(row);
}

export async function getOwnedCaseRecord(caseId, ownerTokenHash) {
  const normalizedCaseId = normalizeCaseId(caseId);
  const normalizedOwnerHash = normalizeOwnerHash(ownerTokenHash);

  if (!normalizedCaseId || !normalizedOwnerHash) {
    return null;
  }

  const pool = getPool();
  await ensureSchema(pool);

  const result = await pool.query(
    `
    select
      case_id,
      owner_token_hash,
      owner_claimed_at,
      owner_last_seen_at,
      case_data,
      created_at,
      updated_at
    from thoxie_case
    where case_id = $1
      and owner_token_hash = $2
    limit 1
    `,
    [normalizedCaseId, normalizedOwnerHash]
  );

  return result.rows[0] || null;
}

export async function getOwnedCase(caseId, ownerTokenHash) {
  const row = await getOwnedCaseRecord(caseId, ownerTokenHash);
  return toPublicCaseRow(row);
}

export async function saveCase(caseId, caseData, { ownerTokenHash } = {}) {
  const normalizedCaseId = normalizeCaseId(caseId);
  const normalizedOwnerHash = normalizeOwnerHash(ownerTokenHash);

  if (!normalizedCaseId) {
    throw new Error("Missing caseId");
  }

  if (!normalizedOwnerHash) {
    throw new Error("Missing owner token");
  }

  const pool = getPool();
  await ensureSchema(pool);

  const payload = normalizeCaseData(normalizedCaseId, caseData);

  const result = await pool.query(
    `
    insert into thoxie_case (
      case_id,
      owner_token_hash,
      owner_claimed_at,
      owner_last_seen_at,
      case_data
    )
    values (
      $1,
      $2,
      now(),
      now(),
      $3::jsonb
    )
    on conflict (case_id)
    do update
      set
        case_data = excluded.case_data,
        updated_at = now(),
        owner_token_hash = case
          when coalesce(thoxie_case.owner_token_hash, '') = '' then excluded.owner_token_hash
          else thoxie_case.owner_token_hash
        end,
        owner_claimed_at = case
          when coalesce(thoxie_case.owner_token_hash, '') = '' then coalesce(thoxie_case.owner_claimed_at, now())
          else thoxie_case.owner_claimed_at
        end,
        owner_last_seen_at = case
          when coalesce(thoxie_case.owner_token_hash, '') = ''
            or thoxie_case.owner_token_hash = excluded.owner_token_hash
          then now()
          else thoxie_case.owner_last_seen_at
        end
    where coalesce(thoxie_case.owner_token_hash, '') = ''
       or thoxie_case.owner_token_hash = excluded.owner_token_hash
    returning
      case_id,
      case_data,
      created_at,
      updated_at
    `,
    [normalizedCaseId, normalizedOwnerHash, JSON.stringify(payload)]
  );

  const row = result.rows[0] || null;

  if (!row) {
    const existing = await getCaseRecord(normalizedCaseId);

    if (existing?.owner_token_hash && existing.owner_token_hash !== normalizedOwnerHash) {
      const error = new Error(
        "This case is already linked to a different browser session. Open it from the browser that created it."
      );
      error.code = "CASE_OWNERSHIP_CONFLICT";
      throw error;
    }

    throw new Error("Could not save the case.");
  }

  return toPublicCaseRow(row);
}

export async function getMostRecentCase() {
  const pool = getPool();
  await ensureSchema(pool);

  const result = await pool.query(
    `
    select case_id, case_data, created_at, updated_at
    from thoxie_case
    order by updated_at desc
    limit 1
    `
  );

  return toPublicCaseRow(result.rows[0] || null);
}
