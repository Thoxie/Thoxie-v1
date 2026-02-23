// Path: /app/case-dashboard/NextActionsCard.js
"use client";

import PrimaryButton from "../_components/PrimaryButton";
import SecondaryButton from "../_components/SecondaryButton";
import { ROUTES } from "../_config/routes";
import { resolveSmallClaimsForms } from "../_lib/formRequirementsResolver";
import { getSC100DraftData } from "../_lib/sc100Mapper";

/**
 * NextActionsCard
 * - Preserves existing computed actions (legacy + evaluator)
 * - Adds the mockup baseline bullets as a consistent "starter" list
 */
export default function NextActionsCard({ caseRecord, docs }) {
  // Legacy actions (verified baseline; must not be removed)
  const legacyActions = computeNextActions(caseRecord, docs);

  // New evaluator actions (additive)
  const evaluatorActions = computeEvaluatorActions(caseRecord, docs);

  // Merge + de-dupe by key. Legacy first to preserve existing priorities.
  const actions = mergeActions(legacyActions, evaluatorActions);

  // Mockup baseline bullets (always shown)
  const baseline = [
    "Enter case number and hearing details when assigned",
    "Upload court summons or notice",
    "Add supporting evidence documents",
    "Prepare filing packet",
    "Review hearing preparation checklist",
  ];

  return (
    <div style={styles.card}>
      <div style={styles.title}>Next Actions</div>

      <ul style={styles.ul}>
        {baseline.map((t) => (
          <li key={t} style={styles.li}>
            {t}
          </li>
        ))}
      </ul>

      {/* Keep existing logic visible, but separate so the mockup remains primary */}
      {actions.length ? (
        <div style={{ marginTop: 14 }}>
          <div style={styles.subTitle}>Suggested by THOXIE</div>

          <div style={{ display: "grid", gap: 10 }}>
            {actions.map((a) => (
              <div key={a.key} style={styles.actionRow}>
                <div style={{ fontWeight: 900 }}>{a.label}</div>
                {a.hint ? <div style={styles.hint}>{a.hint}</div> : null}

                {a.href ? (
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {a.primary ? (
                      <PrimaryButton href={a.href}>{a.primary}</PrimaryButton>
                    ) : (
                      <SecondaryButton href={a.href}>Open</SecondaryButton>
                    )}
                    {a.secondaryHref ? (
                      <SecondaryButton href={a.secondaryHref}>
                        {a.secondaryLabel || "More"}
                      </SecondaryButton>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function mergeActions(a = [], b = []) {
  const out = [];
  const seen = new Set();
  [...a, ...b].forEach((x) => {
    if (!x || !x.key) return;
    if (seen.has(x.key)) return;
    seen.add(x.key);
    out.push(x);
  });
  return out;
}

function computeNextActions(caseRecord, docs) {
  const actions = [];
  const caseId = caseRecord?.id || "";

  if (!caseRecord?.caseNumber) {
    actions.push({
      key: "need-case-number",
      label: "Add your case number",
      hint: "You can enter it in Court & Case Details.",
      href: `${ROUTES.dashboard}?caseId=${encodeURIComponent(caseId)}`,
      primary: "Open Dashboard",
    });
  }

  if (!caseRecord?.hearingDate || !caseRecord?.hearingTime) {
    actions.push({
      key: "need-hearing",
      label: "Add your hearing date & time",
      hint: "Enter it in Hearing Information so THOXIE can guide deadlines.",
      href: `${ROUTES.dashboard}?caseId=${encodeURIComponent(caseId)}`,
      primary: "Open Dashboard",
    });
  }

  const docCount = Array.isArray(docs) ? docs.length : 0;
  if (docCount === 0) {
    actions.push({
      key: "upload-docs",
      label: "Upload your documents",
      hint: "Court notice + any evidence (photos, invoices, texts, emails).",
      href: `${ROUTES.documents}?caseId=${encodeURIComponent(caseId)}`,
      primary: "Upload Documents",
    });
  }

  const hasFacts = Boolean(caseRecord?.facts && String(caseRecord.facts).trim());
  const hasParties = Boolean(
    (caseRecord?.parties?.plaintiff && String(caseRecord.parties.plaintiff).trim()) ||
      (caseRecord?.parties?.defendant && String(caseRecord.parties.defendant).trim())
  );
  if (!hasFacts || !hasParties) {
    actions.push({
      key: "edit-intake",
      label: "Fill in your intake (facts + parties)",
      hint: "This helps THOXIE draft forms and keep your story consistent.",
      href: `${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}`,
      primary: "Edit Intake",
    });
  }

  actions.push({
    key: "open-drafts",
    label: "Review or generate drafts",
    hint: "Use Drafts to generate a draft and review before printing/filing.",
    href: `${ROUTES.drafts}?caseId=${encodeURIComponent(caseId)}`,
    primary: "Open Drafts",
  });

  return actions;
}

function computeEvaluatorActions(caseRecord, docs) {
  const actions = [];
  const caseId = caseRecord?.id || "";

  try {
    const required = resolveSmallClaimsForms(caseRecord, docs);
    if (Array.isArray(required) && required.length > 0) {
      actions.push({
        key: "required-forms",
        label: "Check required forms for your case",
        hint: `Potential forms: ${required.slice(0, 4).join(", ")}${required.length > 4 ? "…" : ""}`,
        href: `${ROUTES.filingGuidance}?caseId=${encodeURIComponent(caseId)}`,
        primary: "Filing Guidance",
      });
    }
  } catch {}

  try {
    const mapped = getSC100DraftData(caseRecord);
    if (!mapped?.plaintiffName || !mapped?.defendantName) {
      actions.push({
        key: "sc100-missing-parties",
        label: "SC-100: confirm plaintiff/defendant names",
        hint: "Missing names can cause filing delays.",
        href: `${ROUTES.intake}?caseId=${encodeURIComponent(caseId)}`,
        primary: "Edit Intake",
      });
    }
  } catch {}

  return actions;
}

const styles = {
  card: {
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 18,
    background: "#fff",
    boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
  },
  title: { fontWeight: 900, fontSize: 20, marginBottom: 10 },
  subTitle: { fontWeight: 900, fontSize: 14, marginBottom: 8, color: "#444" },
  ul: { margin: 0, paddingLeft: 20, lineHeight: 1.9 },
  li: { marginBottom: 2 },
  actionRow: {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    background: "#fafafa",
  },
  hint: { marginTop: 4, color: "#666", fontSize: 13, fontWeight: 700 },
};

