// path: /app/page.js
export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
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
            style={{ height: "46px", width: "auto", display: "block" }}
          />
          <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "18px" }}>
            California
          </div>
        </div>

        {/* Navigation (inside orange) */}
        <nav style={{ display: "flex", gap: "18px" }}>
          {["How It Works", "Start", "Dashboard"].map((label) => (
            <a
              key={label}
              href="#"
              style={{
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 800,
                letterSpacing: "0.2px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "2px solid rgba(255,255,255,0.35)",
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      {/* Mock-up body */}
      <section style={{ padding: "28px 20px" }}>
        <h1 style={{ margin: 0, fontSize: "28px" }}>
          California Small Claims (Mock-up)
        </h1>
        <p style={{ marginTop: "10px", maxWidth: "720px", fontSize: "16px" }}>
          Visual mock-up first. Next we’ll wire the intake flow, document preview,
          and a simple checklist.
        </p>
      </section>
    </main>
  );
}
