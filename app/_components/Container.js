// path: /app/_components/Container.js
export default function Container({ children, style }) {
  return (
    <div
      style={{
        maxWidth: "980px",
        margin: "0 auto",
        padding: "20px 20px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
