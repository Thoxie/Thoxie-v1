/* FILE: app/api/documents/route.js */
/* ACTION: CREATE NEW DIRECTORY + CREATE NEW FILE
   CREATE DIRECTORY IF NEEDED: app/api/documents/
*/

import { NextResponse } from "next/server";
import { getPool } from "@/app/_lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rowToDoc(row) {
  if (!row) return null;

  return {
    docId: row.doc_id,
    caseId: row.case_id,
    name: row.name || "",
    mimeType: row.mime_type || "",
    size: Number(row.size_bytes || 0),
    sizeBytes: Number(row.size_bytes || 0),
    docType: row.doc_type || "evidence",
    docTypeLabel: null,
    exhibitDescription: row.exhibit_description || "",
    evidenceCategory: row.evidence_category || "",
    evidenceSupports: Array.isArray(row.evidence_supports) ? row.evidence_supports : [],
    blobUrl: row.blob_url || "",
    uploadedAt: row.uploaded_at || "",
    extractedText: row.extracted_text || "",
  };
}

function cleanPatch(patch) {
  const input = patch && typeof patch === "object" ? patch : {};
  const next = {};

  if ("docType" in input) {
    next.docType = String(input.docType || "").trim() || null;
  }

  if ("exhibitDescription" in input) {
    next.exhibitDescription = String(input.exhibitDescription || "").trim();
  }

  if ("evidenceCategory" in input) {
    next.evidenceCategory = String(input.evidenceCategory || "").trim();
  }

  if ("evidenceSupports" in input) {
    next.evidenceSupports = Array.isArray(input.evidenceSupports)
      ? input.evidenceSupports.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
  }

  return next;
}

async function getDocRow(pool, docId) {
  const result = await pool.query(
    `
    select
      doc_id,
      case_id,
      name,
      mime_type,
      size_bytes,
      doc_type,
      exhibit_description,
      evidence_category,
      evidence_supports,
      blob_url,
      uploaded_at,
      extracted_text
    from thoxie_document
    where doc_id = $1
    limit 1
    `,
    [docId]
  );

  return result.rows[0] || null;
}

export async function GET(req) {
  try {
    const pool = getPool();
    const { searchParams } = new URL(req.url);

    const caseId = String(searchParams.get("caseId") || "").trim();
    const docId = String(searchParams.get("docId") || "").trim();
    const open = String(searchParams.get("open") || "").trim() === "1";

    if (open) {
      if (!docId) {
        return NextResponse.json(
          { ok: false, error: "Missing docId" },
          { status: 400 }
        );
      }

      const row = await getDocRow(pool, docId);
      if (!row) {
        return NextResponse.json(
          { ok: false, error: "Document not found" },
          { status: 404 }
        );
      }

      if (!row.blob_url) {
        return NextResponse.json(
          { ok: false, error: "This document does not have a stored file blob yet" },
          { status: 404 }
        );
      }

      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (!token) {
        return NextResponse.json(
          { ok: false, error: "Missing BLOB_READ_WRITE_TOKEN in environment" },
          { status: 500 }
        );
      }

      const blobRes = await fetch(row.blob_url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!blobRes.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: `Could not read blob file (${blobRes.status})`,
          },
          { status: 502 }
        );
      }

      const contentType =
        row.mime_type ||
        blobRes.headers.get("content-type") ||
        "application/octet-stream";

      const safeName = String(row.name || "document")
        .replace(/"/g, "")
        .replace(/\r/g, "")
        .replace(/\n/g, "");

      return new Response(blobRes.body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${safeName}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (docId) {
      const row = await getDocRow(pool, docId);

      return NextResponse.json({
        ok: true,
        document: rowToDoc(row),
      });
    }

    if (!caseId) {
      return NextResponse.json(
        { ok: false, error: "Missing caseId" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      select
        doc_id,
        case_id,
        name,
        mime_type,
        size_bytes,
        doc_type,
        exhibit_description,
        evidence_category,
        evidence_supports,
        blob_url,
        uploaded_at,
        extracted_text
      from thoxie_document
      where case_id = $1
      order by uploaded_at desc, name asc
      `,
      [caseId]
    );

    return NextResponse.json({
      ok: true,
      documents: result.rows.map(rowToDoc),
    });
  } catch (err) {
    console.error("DOCUMENTS GET ERROR:", err);

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load documents" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const pool = getPool();
    const body = await req.json();
    const docId = String(body?.docId || "").trim();
    const patch = cleanPatch(body?.patch);

    if (!docId) {
      return NextResponse.json(
        { ok: false, error: "Missing docId" },
        { status: 400 }
      );
    }

    const current = await getDocRow(pool, docId);
    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Document not found" },
        { status: 404 }
      );
    }

    const nextDocType =
      "docType" in patch ? patch.docType : current.doc_type;

    const nextExhibitDescription =
      "exhibitDescription" in patch
        ? patch.exhibitDescription
        : current.exhibit_description;

    const nextEvidenceCategory =
      "evidenceCategory" in patch
        ? patch.evidenceCategory
        : current.evidence_category;

    const nextEvidenceSupports =
      "evidenceSupports" in patch
        ? patch.evidenceSupports
        : Array.isArray(current.evidence_supports)
          ? current.evidence_supports
          : [];

    const result = await pool.query(
      `
      update thoxie_document
      set
        doc_type = $2,
        exhibit_description = $3,
        evidence_category = $4,
        evidence_supports = $5
      where doc_id = $1
      returning
        doc_id,
        case_id,
        name,
        mime_type,
        size_bytes,
        doc_type,
        exhibit_description,
        evidence_category,
        evidence_supports,
        blob_url,
        uploaded_at,
        extracted_text
      `,
      [
        docId,
        nextDocType,
        nextExhibitDescription,
        nextEvidenceCategory,
        JSON.stringify(nextEvidenceSupports),
      ]
    );

    return NextResponse.json({
      ok: true,
      document: rowToDoc(result.rows[0] || null),
    });
  } catch (err) {
    console.error("DOCUMENTS PATCH ERROR:", err);

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update document" },
      { status: 500 }
    );
  }
}
