/* 3. PATH: app/api/case/load/route.js */
/* 3. FILE: route.js */
/* 3. ACTION: OVERWRITE */

import { NextResponse } from 'next/server';
import { getCase, getMostRecentCase } from '@/app/_lib/server/caseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeRow(row) {
  if (!row) return null;

  const data = row.case_data && typeof row.case_data === 'object' ? row.case_data : {};

  return {
    ...data,
    id: data.id || row.case_id,
    createdAt: data.createdAt || row.created_at || '',
    updatedAt: data.updatedAt || row.updated_at || '',
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId = String(searchParams.get('caseId') || '').trim();

    const row = caseId ? await getCase(caseId) : await getMostRecentCase();

    return NextResponse.json({
      success: true,
      case: normalizeRow(row),
    });
  } catch (err) {
    console.error('CASE LOAD ERROR:', err);

    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load case' },
      { status: 500 }
    );
  }
}
