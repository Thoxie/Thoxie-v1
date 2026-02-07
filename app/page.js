// path: /app/page.js
export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh" }}>
      {/* Orange Header Bar */}
      <header
        style={{
          backgroundColor: "#f15a22",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src="/thoxie-logo.png"
            alt="Thoxie"
            style={{ height: "46px", width: "auto" }}
          />
          <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "18px" }}>
            California
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ display: "flex", gap: "18px" }}>
          <a href="/how-it-works" style={navStyle}>
            How It Works
          </a>
          <a href="/start" style={navStyle}>
            Start
          </a>
          <a href="/case-dashboard" style={navStyle}>
            Dashboard
          </a>
        </nav>
      </header>

      {/* Body */}
      <section style={{ padding: "28px 20px" }}>
        <h1 style={{ fontSize: "28px", margin: 0 }}>
          California Small Claims (Mock-up)
        </h1>
        <p style={{ marginTop: "10px", maxWidth: "720px", fontSize: "16px" }}>
          This is a visual mock-up only. Next steps will wire the intake flow and
          document preview.
        </p>
      </section>
    </main>
  );
}

const navStyle = {
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 800,
  letterSpacing: "0.2px",
  padding: "8px 10px",
  borderRadius: "8px",
  border: "2px solid rgba(255,255,255,0.35)",
};
