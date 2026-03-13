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
    if (activeCaseId) return `${ROUTES.intake}?caseId=${encodeURIComponent(activeCaseId)}`;
    return ROUTES.start;
  }, [activeCaseId]);

  const dashboardHref = useMemo(() => {
    if (activeCaseId) return `${ROUTES.dashboard}?caseId=${encodeURIComponent(activeCaseId)}`;
    return ROUTES.dashboard;
  }, [activeCaseId]);

  return (
    <header
      className="Small Claims Genie-siteHeader"
      style={{
        backgroundColor: "#F4A742",
        padding: "4px 15px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <a href={ROUTES.home} style={{ display: "inline-block" }} aria-label="Small Claims Genie Home">
          <img
            className="Small Claims Genie-siteHeaderLogo"
            src="/Small Claims Genie-logo.png"
            alt="Small Claims Genie"
            style={{
              height: "96px",
              transform: "scale(2)",
              transformOrigin: "left center",
              display: "block"
            }}
          />
        </a>
      </div>

      <nav className="Small Claims Genie-siteNav" style={{ display: "flex", gap: "12px" }}>
        <NavLink href={ROUTES.home}>Home</NavLink>
        <NavLink href={ROUTES.howItWorks}>How It Works</NavLink>

        <NavLink href={ROUTES.typesOfCases}>Types of Cases</NavLink>

        <NavLink
          href={startHref}
          onClick={(e) => {
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

        {/* FAQs navigation */}
        <NavLink href={ROUTES.faq}>FAQs</NavLink>

        <NavLink href={ROUTES.resources}>Resources</NavLink>
      </nav>
    </header>
  );
}

function NavLink({ href, children, onClick }) {
  return (
    <a
      className="Small Claims Genie-siteNavLink"
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
