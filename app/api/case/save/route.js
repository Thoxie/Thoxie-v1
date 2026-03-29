// PATH: /app/api/case/save/route.js
// DIRECTORY: /app/api/case/save
// FILE: route.js
// ACTION: FULL OVERWRITE

import { NextResponse } from "next/server";
import {
  createOwnerToken,
  getOwnerTokenFromRequest,
  hashOwnerToken,
  isOwnershipConflictError,
  OWNER_COOKIE_MAX_AGE_SECONDS,
  OWNER_COOKIE_NAME,
  saveCase,
} from "@/app/_lib/server/caseService";

export const runtime = "nodejs";

function getOrCreateOwnerToken(req) {
  return getOwnerTokenFromRequest(req) || createOwnerToken();
}

function normalizeRequestBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { caseId: "", caseData: {} };
  }

  const caseId = String(body.caseId || body.case_id || "").trim();
  const sourceCaseData = body.caseData && typeof body.caseData === "object" && !Array.isArray(body.caseData)
    ? body.caseData
    : {};

  return {
    caseId,
    caseData: {
      ...sourceCaseData,
      id: String(sourceCaseData.id || caseId || "").trim() || caseId,
    },
  };
}

function attachOwnerCookie(response, token) {
  response.cookies.set({
    name: OWNER_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OWNER_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

export async function POST(req) {
  let ownerToken = "";

  try {
    let body;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { caseId, caseData } = normalizeRequestBody(body);

    if (!caseId) {
      return NextResponse.json(
        { error: "Missing caseId" },
        { status: 400 }
      );
    }

    ownerToken = getOrCreateOwnerToken(req);

    const saved = await saveCase(caseId, caseData, {
      ownerTokenHash: hashOwnerToken(ownerToken),
    });

    const response = NextResponse.json({
      success: true,
      case: saved,
    });

    return attachOwnerCookie(response, ownerToken);
  } catch (err) {
    console.error("CASE SAVE ERROR:", err);

    const status = isOwnershipConflictError(err) ? 403 : 500;
    const response = NextResponse.json(
      { error: err?.message || "Failed to save case" },
      { status }
    );

    if (ownerToken) {
      return attachOwnerCookie(response, ownerToken);
    }

    return response;
  }
}
