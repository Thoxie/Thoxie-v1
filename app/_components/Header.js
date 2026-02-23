// Path: /app/_components/Header.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ROUTES } from "../_config/routes";
import { CaseRepository } from "../_repository/caseRepository";

export default function Header() {
  const router = useRouter();
  const [activeCaseId, setActiveCaseId] = useState("");

  useEffect(() => {
    try {
      const id = CaseRepository.getActiveId();
      setActiveCaseId(id || "");
    } catch {
      setActiveCaseId("");
    }
  }, []);

  const startHref = useMemo(() => {
    // Single-case beta:
    // - If a case exists, "Start" should take user to Edit Intake.
    // - If no case exists, "Start" takes user to create a case (jurisdiction screen).
    if (activeCaseId) return `${ROUTES.intake}?caseId=${encodeURIComponent(activeCaseId)}`;
    return ROUTES.start;
  }, [activeCaseId]);

  const dashboardHref = useMemo(() => {
    // If a case exists, jump straight into the hub.
    if (activeCaseId) return `${ROUTES.dashboard}?caseId=${encodeURIComponent(activeCaseId)}`;
    return ROUTES.dashboard;
  }, [activeCaseId]);

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
        <a href={ROUTES.home} style={{ display: "inline-block" }} aria-label="Thoxie Home">
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
        </a>
      </div>

      <nav className="thoxie-siteNav" style={{ display: "flex", gap: "12px" }}>
        <NavLink href={ROUTES.home}>Home</NavLink>
        <NavLink href={ROUTES.howItWorks}>How It Works</NavLink>

        {/* Phase 2: state-aware */}
        <NavLink
          href={startHref}
          onClick={(e) => {
            // Ensure client-side navigation stays consistent with activeCaseId
            e.preventDefault();
            router.push(startHref);
          }}
        >
          Start
        </NavLink>

        <NavLink
          href={dashboardHref}
          onClick={(e) => {
            e.preventDefault();
            router.push(dashboardHref);
          }}
        >
          Dashboard
        </NavLink>

        <NavLink href={ROUTES.resources}>Resources</NavLink>
      </nav>
    </header>
  );
}

function NavLink({ href, children, onClick }) {
  return (
    <a
      className="thoxie-siteNavLink"
      href={href}
      onClick={onClick}
      style={{
        color: "#ffffff",
        textDecoration: "none",
        fontWeight: 800,
        padding: "8px 10px",
        borderRadius: "10px"
      }}
    >
      {children}
    </a>
  );
}

