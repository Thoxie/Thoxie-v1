// Path: /app/api/ai/chat/route.js
import { NextResponse } from "next/server";
import { getAIConfig, isLiveAIEnabled } from "../../../_lib/ai/server/aiConfig";

/**
 * POST /api/ai/chat
 * Accepts: { caseId?, messages?, prompt?, mode? }
 * Returns: { ok, usedLiveModel, reply, ... }
 */
export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const cfg = getAIConfig();
  const mode = typeof body.mode === "string" ? body.mode : "chat";
  const caseId = typeof body.caseId === "string" ? body.caseId : null;
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const incomingMessages = Array.isArray(body.messages) ? body.messages : [];

  const messages = normalizeMessages({ prompt, messages: incomingMessages });

  if (!isLiveAIEnabl

