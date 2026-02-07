// path: /app/_components/Field.js
export default function Field({ label, value, placeholder }) {
  return (
    <div
      style={{
        border: "1px solid #e6e6e6",
        borderRadius: "12px",
        padding: "12px 14px",
        background: "#fafafa",
        marginTop: "12px",
        maxWidth: "820px",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 900, marginBottom: "6px" }}>
        {label}
      </div>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "10px 12px",
          background: "#fff",
          color: value ? "#111" : "#777",
        }}
      >
        {value || placeholder}
      </div>
    </div>
  );
}

