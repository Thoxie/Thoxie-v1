/* FILE: app/_lib/server/caseService.js */

import { getPool } from "@/app/_lib/server/db";

export async function saveCase(caseId, caseData) {
  const pool = getPool();

  const query = `
  insert into thoxie_case (case_id, case_data)
  values ($1, $2)
  on conflict (case_id)
  do update set
    case_data = excluded.case_data,
    updated_at = now()
  returning case_id, case_data, updated_at;
  `;

  const result = await pool.query(query, [
    caseId,
    JSON.stringify(caseData)
  ]);

  return result.rows[0];
}

export async function getCase(caseId) {
  const pool = getPool();

  const query = `
  select case_id, case_data, updated_at
  from thoxie_case
  where case_id = $1
  `;

  const result = await pool.query(query, [caseId]);

  return result.rows[0] || null;
}
