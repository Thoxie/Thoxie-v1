// path: /app/_components/PrimaryButton.js
export default function PrimaryButton({ href, children, style }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        padding: "10px 12px",
        borderRadius: "10px",
        textDecoration: "none",
        fontWeight: 800,
        background: "#111",
        color: "#fff",
        ...style,
      }}
    >
      {children}
    </a>
  );
}

