/* 2. PATH: app/_lib/server/caseService.js */
/* 2. FILE: caseService.js */
/* 2. ACTION: OVERWRITE */

import { getPool } from '@/app/_lib/server/db';
import { ensureSchema } from '@/app/_lib/server/ensureSchema';

export async function saveCase(caseId, caseData) {
  const pool = getPool();
  await ensureSchema(pool);

  const result = await pool.query(
    `
    insert into thoxie_case (case_id, case_data)
    values ($1, $2)
    on conflict (case_id)
    do update set
      case_data = excluded.case_data,
      updated_at = now()
    returning case_id, case_data, created_at, updated_at
    `,
    [caseId, JSON.stringify(caseData || {})]
  );

  return result.rows[0] || null;
}

export async function getCase(caseId) {
  const pool = getPool();
  await ensureSchema(pool);

  const result = await pool.query(
    `
    select case_id, case_data, created_at, updated_at
    from thoxie_case
    where case_id = $1
    limit 1
    `,
    [caseId]
  );

  return result.rows[0] || null;
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

  return result.rows[0] || null;
}
