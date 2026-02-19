// Path: /app/api/rag/status/route.js

import { NextResponse } from "next/server";
import { listCaseDocs } from "../../../_lib/rag/memoryIndex";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const caseId = String(body.caseId || "").trim() || "no-case";
  return NextResponse.json({ ok: true, caseId, docs: listCaseDocs(caseId) });
}

