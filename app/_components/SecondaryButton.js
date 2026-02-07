
// path: /app/_components/SecondaryButton.js
export default function SecondaryButton({ href, children, style }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        padding: "10px 12px",
        borderRadius: "10px",
        textDecoration: "none",
        fontWeight: 800,
        border: "2px solid #111",
        color: "#111",
        ...style,
      }}
    >
      {children}
    </a>
  );
}
