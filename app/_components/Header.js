// path: /app/_components/Header.js
export default function Header() {
  return (
    <header
      style={{
        backgroundColor: "#f15a22",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
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

      <nav style={{ display: "flex", gap: "18px" }}>
        <NavLink href="/how-it-works">How It Works</NavLink>
        <NavLink href="/start">Start</NavLink>
        <NavLink href="/case-dashboard">Dashboard</NavLink>
      </nav>
    </header>
  );
}

function NavLink({ href, children }) {
  return (
    <a
      href={href}
      style={{
        color: "#ffffff",
        textDecoration: "none",
        fontWeight: 800,
        padding: "8px 10px",
        borderRadius: "8px",
        border: "2px solid rgba(255,255,255,0.35)",
      }}
    >
      {children}
    </a>
  );
}

