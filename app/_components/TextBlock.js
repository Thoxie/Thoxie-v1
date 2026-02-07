// path: /app/_components/TextBlock.js
export default function TextBlock({ label, value, placeholder }) {
  return (
    <div style={{ marginTop: "12px", maxWidth: "820px" }}>
      <div style={{ fontSize: "13px", fontWeight: 900, marginBottom: "6px" }}>
        {label}
      </div>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "12px",
          background: "#fff",
          color: value ? "#111" : "#777",
          minHeight: "90px",
          lineHeight: 1.7,
        }}
      >
        {value || placeholder}
      </div>
    </div>
  );
}

