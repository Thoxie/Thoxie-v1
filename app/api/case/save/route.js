/* FILE: app/api/case/save/route.js */
/* ACTION: CREATE NEW FILE
   CREATE DIRECTORY IF NEEDED: app/api/case/save/
   IF FILE ALREADY EXISTS, FULLY OVERWRITE IT
*/

import { NextResponse } from "next/server";
import { saveCase } from "@/app/_lib/server/caseService";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { caseId, caseData } = body;

    if (!caseId) {
      return NextResponse.json(
        { error: "Missing caseId" },
        { status: 400 }
      );
    }

    const saved = await saveCase(caseId, caseData || {});

    return NextResponse.json({
      success: true,
      case: saved,
    });
  } catch (err) {
    console.error("CASE SAVE ERROR:", err);

    return NextResponse.json(
      { error: err.message || "Failed to save case" },
      { status: 500 }
    );
  }
}
