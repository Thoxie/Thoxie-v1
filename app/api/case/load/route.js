/* FILE: app/api/case/load/route.js */
/* ACTION: CREATE NEW DIRECTORY + CREATE NEW FILE
   CREATE DIRECTORY IF NEEDED: app/api/case/load/
*/

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";

export const runtime = "nodejs";

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

export async function GET(req) {
  try {
    const pool = getPool();
    const { searchParams } = new URL(req.url);
    const caseId = (searchParams.get("caseId") || "").trim();

    if (caseId) {
      const result = await pool.query(
        `
        select case_id, case_data, created_at, updated_at
        from thoxie_case
        where case_id = $1
        limit 1
        `,
        [caseId]
      );

      const row = result.rows[0] || null;

      return NextResponse.json({
        success: true,
        case: normalizeRow(row),
      });
    }

    const result = await pool.query(
      `
      select case_id, case_data, created_at, updated_at
      from thoxie_case
      order by updated_at desc
      limit 1
      `
    );

    const row = result.rows[0] || null;

    return NextResponse.json({
      success: true,
      case: normalizeRow(row),
    });
  } catch (err) {
    console.error("CASE LOAD ERROR:", err);

    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load case" },
      { status: 500 }
    );
  }
}
