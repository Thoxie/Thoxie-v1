// Path: /app/case-dashboard/_components/InfoBanner.js
"use client";

export default function InfoBanner({ type = "error", children }) {
  const styles =
    type === "error"
      ? {
          border: "1px solid #fecaca",
          background: "#fef2f2",
          color: "#991b1b",
        }
      : {
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
          color: "#111827",
        };

  return (
    <div
      style={{
        marginTop: 12,
        padding: 10,
        borderRadius: 12,
        fontSize: 13,
        ...styles,
      }}
    >
      {children}
    </div>
  );
}

