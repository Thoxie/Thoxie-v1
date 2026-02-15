// Path: /app/case-dashboard/CaseHub.js
"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "../_components/Container";
import EmptyState from "../_components/EmptyState";
import PageTitle from "../_components/PageTitle";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";
import { DocumentRepository } from "../_repository/documentRepository";

/* Draft support */
import { DraftRepository } from "../_repository/draftRepository";
import { generateSmallClaimsDraft } from "../_lib/draftGenerator";
import { createDraftRecord } from "../._schemas/draftSchema";

/* Existing UI */
import DraftsCard from "./_components/DraftsCard";
import NextActionsCard from "./NextActionsCard";
import HubHeader from "./_components/HubHeader";
import CaseSummaryCard from "./_components/CaseSummaryCard";

/* Forms resolver */
import { resolveSmallClaimsForms } from "../_lib/formRequirementsResolver";
import { getFormsConfig } from "../_config/forms";

function FormsPanel({ caseRecord }) {
  const resolved = useMemo(() => resolveSmallClaimsForms(caseRecord || {}), [caseRecord]);

  const cfg = useMemo(() => getFormsConfig("CA", "small_claims"), []);
  const registry = cfg?.forms || {};

  const required = (resolved.required || []).map((f) => ({
    ...f,
    url: registry?.[f.code]?.url || "",
  }));

  const conditional = (resolved.conditional || []).map((f) => ({
    ...f,
    url: registry?.[f.code]?.url || "",
  }));

  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 14, background: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Forms</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>Filing + Service (CA Small Claims)</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {caseRecord?.jurisdiction?.county ? `County: ${caseRecord.jurisdiction.county}` : "County: (not set)"}
        </div>
      </div>

      {resolved.missingInfoQuestions?.length ? (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "rgba(0,0,0,0.04)" }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>Needed to finalize recommendations</div>
          <ul style={{ margin: "8px 0 0 18px", fontSize: 12 }}>
            {resolved.missingInfoQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Included</div>
        <div style={{ display: "grid", gap: 6 }}>
          {required.map((f) => (
            <div key={f.code} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{f.code}</div>
                <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.title}</div>
              </div>
              {f.url ? (
                <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, textDecoration: "none", padding: "6px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)" }}>
                  Download
                </a>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.6 }}>No link</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Conditional</div>
        <div style={{ display: "grid", gap: 6 }}>
          {conditional.length ? (
            conditional.map((f) => (
              <div key={f.code} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px", border: "1px dashed rgba(0,0,0,0.22)", borderRadius: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{f.code}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.title}</div>
                  {f.reason ? <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{f.reason}</div> : null}
                </div>
                {f.url ? (
                  <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, textDecoration: "none", padding: "6px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)" }}>
                    Download
                  </a>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.6 }}>No link</div>
                )}
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, opacity: 0.75 }}>None.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CaseHub({ caseId }) {
  const [caseRecord, setCaseRecord] = useState(null);
  const [docs, setDocs] = useState([]);
  const [err, setErr] = useState("");

  async function refreshDocs(id) {
    try {
      const list = await DocumentRepository.listByCaseId(id);
      setDocs(Array.isArray(list) ? list : []);
    } catch {
      setDocs([]);
    }
  }

  async function handleGenerateDraft() {
    if (!caseRecord) return;

    try {
      const draftData = generateSmallClaimsDraft(caseRecord);

      const draftRecord = createDraftRecord({
        caseId,
        ...draftData,
      });

      await DraftRepository.create(draftRecord);

      window.location.href = `/draft-preview?draftId=${draftRecord.draftId}`;
    } catch {
      setErr("Failed to generate draft.");
    }
  }

  useEffect(() => {
    setErr("");
    try {
      const c = CaseRepository.getById(caseId);
      setCaseRecord(c || null);
    } catch {
      setCaseRecord(null);
    }
    refreshDocs(caseId);
  }, [caseId]);

  const subtitle = useMemo(() => {
    const county = caseRecord?.jurisdiction?.county || "";
    const court = caseRecord?.jurisdiction?.courtName || "";
    if (county || court) return `${county || "CA"} · ${court || "Court"}`;
    return `Case ID: ${caseId}`;
  }, [caseId, caseRecord]);

  if (!caseRecord) {
    return (
      <Container>
        <div style={{ padding: "18px 0" }}>
          <PageTitle>Case Hub</PageTitle>
          <EmptyState
            title="Case not found"
            message="This caseId does not exist in your local storage."
            ctaHref={ROUTES.dashboard}
            ctaLabel="Back to Case List"
          />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ padding: "18px 0" }}>
        <HubHeader title="Case Hub" subtitle={subtitle} caseId={caseId} docCount={docs.length} routes={ROUTES} />

        {err ? (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
            {err}
          </div>
        ) : null}

        <div style={{ marginTop: 16 }}>
          <button onClick={handleGenerateDraft}>Generate Draft</button>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <DraftsCard caseId={caseId} />
          <FormsPanel caseRecord={caseRecord} />
          <NextActionsCard caseRecord={caseRecord} docs={docs} />
          <CaseSummaryCard caseRecord={caseRecord} />
        </div>
      </div>
    </Container>
  );
}

