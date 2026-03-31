// PATH: /app/api/blob-upload/route.js
// DIRECTORY: /app/api/blob-upload
// FILE: route.js
// ACTION: NEW FILE

import { handleUpload } from "@vercel/blob/client";
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
export const maxDuration = 60;

const OWNERSHIP_ERROR_MESSAGE =
  "This case is linked to a different browser session. Open it from the browser that created it.";
const PDF_MIME_TYPE = "application/pdf";

function cleanText(value) {
  return String(value || "").trim();
}

function safeSegment(value, fallback = "file") {
  const cleaned = cleanText(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || fallback;
}

function fileExtension(name) {
  const raw = cleanText(name).toLowerCase();
  const idx = raw.lastIndexOf(".");
  return idx >= 0 ? raw.slice(idx) : "";
}

function normalizePdfName(name) {
  const normalized = cleanText(name) || "upload.pdf";
  return fileExtension(normalized) === ".pdf" ? normalized : `${normalized}.pdf`;
}

function parseClientPayload(input) {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return input && typeof input === "object" ? input : {};
}

function attachOwnerCookie(response, ownerToken) {
  if (!ownerToken) return response;

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

function json(data, status = 200, ownerToken = "") {
  return attachOwnerCookie(NextResponse.json(data, { status }), ownerToken);
}

async function getCaseOwnershipRow(pool, caseId) {
  const result = await pool.query(
    `
    select case_id, owner_token_hash
    from thoxie_case
    where case_id = $1
    limit 1
    `,
    [caseId]
  );

  return result.rows[0] || null;
}

async function authorizeCaseUploadAccess(req, pool, caseId) {
  const normalizedCaseId = cleanText(caseId);

  if (!normalizedCaseId) {
    return {
      ok: false,
      status: 400,
      error: "Missing caseId",
      ownerTokenToSet: "",
    };
  }

  const row = await getCaseOwnershipRow(pool, normalizedCaseId);
  if (!row) {
    return {
      ok: false,
      status: 404,
      error: "Case not found. Save the case before uploading documents.",
      ownerTokenToSet: "",
    };
  }

  const rowOwnerHash = cleanText(row.owner_token_hash).toLowerCase();
  const requestOwnerToken = getOwnerTokenFromRequest(req);
  const requestOwnerHash = hashOwnerToken(requestOwnerToken);

  if (rowOwnerHash) {
    if (!requestOwnerHash || requestOwnerHash !== rowOwnerHash) {
      return {
        ok: false,
        status: 403,
        error: OWNERSHIP_ERROR_MESSAGE,
        ownerTokenToSet: "",
      };
    }

    return {
      ok: true,
      caseId: normalizedCaseId,
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
    returning case_id, owner_token_hash
    `,
    [normalizedCaseId, ownerTokenHash]
  );

  const claimedRow = claimResult.rows[0] || null;
  if (claimedRow) {
    return {
      ok: true,
      caseId: normalizedCaseId,
      ownerTokenToSet,
    };
  }

  const refreshedRow = await getCaseOwnershipRow(pool, normalizedCaseId);
  const refreshedOwnerHash = cleanText(refreshedRow?.owner_token_hash).toLowerCase();

  if (refreshedOwnerHash && refreshedOwnerHash === ownerTokenHash) {
    return {
      ok: true,
      caseId: normalizedCaseId,
      ownerTokenToSet,
    };
  }

  return {
    ok: false,
    status: 403,
    error: OWNERSHIP_ERROR_MESSAGE,
    ownerTokenToSet: "",
  };
}

function validatePdfUploadRequest({ pathname, payload }) {
  const caseId = cleanText(payload.caseId);
  const docId = cleanText(payload.docId);
  const docType = cleanText(payload.docType) || "evidence";
  const name = normalizePdfName(payload.name || pathname.split("/").pop() || "upload.pdf");
  const sizeBytes = Number(payload.sizeBytes || 0);
  const normalizedPathname = cleanText(pathname);

  if (!caseId) {
    throw new Error("Missing caseId in clientPayload");
  }

  if (!docId) {
    throw new Error("Missing docId in clientPayload");
  }

  if (!normalizedPathname) {
    throw new Error("Missing blob pathname");
  }

  const expectedPrefix = `cases/${safeSegment(caseId, "case")}/docs/`;
  if (!normalizedPathname.startsWith(expectedPrefix)) {
    throw new Error("Invalid blob pathname for case upload");
  }

  if (fileExtension(name) !== ".pdf") {
    throw new Error("Blob upload route currently accepts PDFs only");
  }

  return {
    caseId,
    docId,
    docType,
    name,
    mimeType: PDF_MIME_TYPE,
    sizeBytes: Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : 0,
    pathname: normalizedPathname,
  };
}

export async function POST(request) {
  const pool = getPool();
  await ensureSchema(pool);

  let ownerTokenToSet = "";

  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseClientPayload(clientPayload);
        const normalized = validatePdfUploadRequest({ pathname, payload });

        const access = await authorizeCaseUploadAccess(request, pool, normalized.caseId);
        if (!access.ok) {
          const error = new Error(access.error || OWNERSHIP_ERROR_MESSAGE);
          error.status = Number(access.status || 403);
          throw error;
        }

        ownerTokenToSet = access.ownerTokenToSet || ownerTokenToSet;

        return {
          allowedContentTypes: [PDF_MIME_TYPE],
          addRandomSuffix: false,
          tokenPayload: JSON.stringify(normalized),
        };
      },
    });

    return json(jsonResponse, 200, ownerTokenToSet);
  } catch (error) {
    const status = Number(error?.status || 400) || 400;
    const message = String(error?.message || error || "Could not prepare blob upload");
    return json({ error: message }, status, ownerTokenToSet);
  }
}
