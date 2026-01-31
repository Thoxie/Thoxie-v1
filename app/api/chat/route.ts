import { NextResponse } from "next/server";
import { enforceGuardrails } from "../../../lib/guardrails";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message : "";

    // Call enforceGuardrails and destructure the result
    const { allowed, reason, systemPreamble } = enforceGuardrails({
      message,
      caseType: body?.caseType ?? "family",
    });

    if (!allowed) {
      return NextResponse.json(
        { success: false, reason: reason ?? "Blocked by guardrails" },
        { status: 400 }
      );
    }

    // Success: you can process the message further
    return NextResponse.json({
      success: true,
      systemPreamble,
      message: "Request passed guardrails — continue processing"
    });
  } catch (err) {
    console.error("POST /api/chat error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
