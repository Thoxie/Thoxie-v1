// Path: /app/_components/Header.js

import { ROUTES } from "../_config/routes";

export default function Header() {
  return (
    <header
      className="thoxie-siteHeader"
      style={{
        backgroundColor: "#F4A742",
        padding: "4px 15px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img
          className="thoxie-siteHeaderLogo"
          src="/thoxie-logo.png"
          alt="Thoxie"
          style={{
            height: "96px",
            transform: "scale(2)",
            transformOrigin: "left center",
            display: "block"
          }}
        />
      </div>

      <nav className="thoxie-siteNav" style={{ display: "flex", gap: "12px" }}>
        <NavLink href={ROUTES.home}>Home</NavLink>
        <NavLink href={ROUTES.howItWorks}>How It Works</NavLink>
        <NavLink href={ROUTES.start}>Start</NavLink>
        <NavLink href={ROUTES.dashboard}>Dashboard</NavLink>
        <NavLink href={ROUTES.resources}>Resources</NavLink>
      </nav>
    </header>
  );
}

function NavLink({ href, children }) {
  return (
    <a
      className="thoxie-siteNavLink"
      href={href}
      style={{
        color: "#ffffff",
        textDecoration: "none",
        fontWeight: 800,
        padding: "8px 10px",
        borderRadius: "8px",
        border: "2px solid rgba(255,255,255,0.35)"
      }}
    >
      {children}
    </a>
  );
}

