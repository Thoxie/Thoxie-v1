// Path: /app/case-dashboard/_components/NextActionsList.js
"use client";

import PrimaryButton from "../../_components/PrimaryButton";
import SecondaryButton from "../../_components/SecondaryButton";

export default function NextActionsList({ actions }) {
  if (!actions || actions.length === 0) {
    return (
      <div style={{ color: "#2e7d32", fontWeight: 900 }}>
        ✅ All core beta items look complete.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {actions.map((a) => (
        <div
          key={a.key}
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 10,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900 }}>{a.title}</div>
            <div style={{ color: "#666", marginTop: 2, lineHeight: 1.5 }}>
              {a.detail}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {a.primaryHref ? (
              <PrimaryButton href={a.primaryHref}>{a.primaryLabel}</PrimaryButton>
            ) : null}
            {a.secondaryHref ? (
              <SecondaryButton href={a.secondaryHref}>{a.secondaryLabel}</SecondaryButton>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

