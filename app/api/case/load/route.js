// PATH: /app/api/case/load/route.js
// DIRECTORY: /app/api/case/load
// FILE: route.js
// ACTION: FULL OVERWRITE

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";
import { ensureSchema } from "@/app/_lib/server/ensureSchema";
import {
  createOwnerToken,
  getOwnerTokenFromRequest,
  hashOwnerToken,
  OWNER_COOKIE_MAX_AGE_SECONDS,
  OWNER_COOKIE_NAME,
} from "@/app/_lib/server/caseService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OWNERSHIP_ERROR_MESSAGE =
  "This case is already linked to a different browser session. Open it from the browser that created it.";

function normalizeCaseId(value) {
  return String(value || "").trim();
}

function attachOwnerCookie(response, ownerToken) {
  if (!ownerToken) {
    return response;
  }

  response.cookies.set({
    name: OWNER_COOKIE_NAME,
    value: ownerToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OWNER_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

function buildJsonResponse(data, status = 200, ownerToken = "") {
  const response = NextResponse.json(data, { status });
  return attachOwnerCookie(response, ownerToken);
}

function normalizeRow(row) {
  if (!row) return null;

  const data = row.case_data && typeof row.case_data === "object" ? row.case_data : {};

  return {
    ...data,
    id: data.id || row.case_id,
    createdAt: data.createdAt || row.created_at || "",
    updatedAt: data.updatedAt || row.updated_at || "",
  };
}

async function readCaseRow(pool, caseId) {
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
    [caseId]
  );

  return result.rows[0] || null;
}

async function authorizeCaseLoad(req, caseId) {
  const normalizedCaseId = normalizeCaseId(caseId);

  if (!normalizedCaseId) {
    return {
      ok: true,
      row: null,
      ownerTokenToSet: "",
    };
  }

  const pool = getPool();
  await ensureSchema(pool);

  const row = await readCaseRow(pool, normalizedCaseId);
  if (!row) {
    return {
      ok: true,
      row: null,
      ownerTokenToSet: "",
    };
  }

  const rowOwnerHash = String(row.owner_token_hash || "").trim().toLowerCase();
  const requestOwnerToken = getOwnerTokenFromRequest(req);
  const requestOwnerHash = hashOwnerToken(requestOwnerToken);

  if (rowOwnerHash) {
    if (!requestOwnerHash || requestOwnerHash !== rowOwnerHash) {
      return {
        ok: false,
        status: 403,
        error: OWNERSHIP_ERROR_MESSAGE,
      };
    }

    return {
      ok: true,
      row,
      ownerTokenToSet: requestOwnerToken || "",
    };
  }

  const ownerTokenToSet = requestOwnerToken || createOwnerToken();
  const ownerTokenHash = hashOwnerToken(ownerTokenToSet);

  const claimResult = await pool.query(
    `
    update thoxie_case
    set
      owner_token_hash = $2,
      owner_claimed_at = coalesce(owner_claimed_at, now()),
      owner_last_seen_at = now()
    where case_id = $1
      and coalesce(owner_token_hash, '') = ''
    returning
      case_id,
      owner_token_hash,
      owner_claimed_at,
      owner_last_seen_at,
      case_data,
      created_at,
      updated_at
    `,
    [normalizedCaseId, ownerTokenHash]
  );

  const claimedRow = claimResult.rows[0] || null;
  if (claimedRow) {
    return {
      ok: true,
      row: claimedRow,
      ownerTokenToSet,
    };
  }

  const refreshedRow = await readCaseRow(pool, normalizedCaseId);
  const refreshedOwnerHash = String(refreshedRow?.owner_token_hash || "").trim().toLowerCase();

  if (refreshedRow && refreshedOwnerHash && refreshedOwnerHash === ownerTokenHash) {
    return {
      ok: true,
      row: refreshedRow,
      ownerTokenToSet,
    };
  }

  return {
    ok: false,
    status: 403,
    error: OWNERSHIP_ERROR_MESSAGE,
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId = normalizeCaseId(searchParams.get("caseId") || "");

    if (!caseId) {
      return buildJsonResponse({
        success: true,
        case: null,
      });
    }

    const access = await authorizeCaseLoad(req, caseId);

    if (!access.ok) {
      return buildJsonResponse(
        {
          success: false,
          case: null,
          error: access.error || "Failed to load case",
        },
        access.status || 403
      );
    }

    return buildJsonResponse(
      {
        success: true,
        case: normalizeRow(access.row),
      },
      200,
      access.ownerTokenToSet || ""
    );
  } catch (err) {
    console.error("CASE LOAD ERROR:", err);

    return buildJsonResponse(
      { success: false, error: err?.message || "Failed to load case" },
      500
    );
  }
}
