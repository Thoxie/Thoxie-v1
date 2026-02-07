// path: /app/_components/Header.js
import { ROUTES } from "../_config/routes";
import StateBadge from "./StateBadge";

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
        <StateBadge />
      </div>

      <nav style={{ display: "flex", gap: "18px" }}>
        <NavLink href={ROUTES.howItWorks}>How It Works</NavLink>
        <NavLink href={ROUTES.start}>Start</NavLink>
        <NavLink href={ROUTES.dashboard}>Dashboard</NavLink>
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

