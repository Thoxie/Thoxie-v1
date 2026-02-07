// path: /app/_components/PageTitle.js
export default function PageTitle({ children }) {
  return (
    <h1
      style={{
        marginTop: 0,
        marginBottom: "14px",
        fontSize: "28px",
        fontWeight: 900,
      }}
    >
      {children}
    </h1>
  );
}

