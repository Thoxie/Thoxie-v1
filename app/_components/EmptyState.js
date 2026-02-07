// path: /app/_components/EmptyState.js
import PrimaryButton from "./PrimaryButton";

export default function EmptyState({ title, message, ctaHref, ctaLabel }) {
  return (
    <div
      style={{
        border: "1px dashed #ddd",
        borderRadius: "12px",
        padding: "24px",
        textAlign: "center",
        maxWidth: "820px",
        background: "#fafafa",
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ color: "#555", lineHeight: 1.7 }}>{message}</p>
      <div style={{ marginTop: "12px" }}>
        <PrimaryButton href={ctaHref}>{ctaLabel}</PrimaryButton>
      </div>
    </div>
  );
}

