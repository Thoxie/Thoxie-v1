// path: /app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "./_components/Header";
import Footer from "./_components/Footer";
import StateBadge from "./_components/StateBadge";
import Container from "./_components/Container";
import PrimaryButton from "./_components/PrimaryButton";
import SecondaryButton from "./_components/SecondaryButton";
import { ROUTES } from "./_config/routes";
import { CaseRepository } from "./_repository/caseRepository";

export default function HomePage() {
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

  const primaryCtaHref = useMemo(() => {
    // Phase 2: home CTA is state-aware
    // - If user already has a case, resume them to dashboard hub.
    // - If no case exists, take them to Start (create flow).
    if (activeCaseId) return `${ROUTES.dashboard}?caseId=${encodeURIComponent(activeCaseId)}`;
    return ROUTES.start;
  }, [activeCaseId]);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1 }}>
        <StateBadge />

        {/* HERO HEADLINE — smaller style */}
        <h1
          style={{
            margin: "14px 0 0 0",
            fontSize: "56px",
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#111",
            maxWidth: "980px"
          }}
        >
          <span style={{ display: "block" }}>Win in Small Claims Court.</span>
          <span style={{ display: "block" }}>Don’t lose because you’re unprepared.</span>
        </h1>

        <div style={{ marginTop: "16px", maxWidth: "980px", fontSize: "18px", lineHeight: 1.45, color: "#333" }}>
          THOXIE helps you organize your case, draft smarter, and stay on track — without paying a lawyer for basics.
        </div>

        {/* CTA ROW */}
        <div style={{ marginTop: "18px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <PrimaryButton
            href={primaryCtaHref}
            onClick={(e) => {
              // Ensure consistent client-side behavior
              e.preventDefault();
              router.push(primaryCtaHref);
            }}
          >
            {activeCaseId ? "Resume Your Case" : "Start Preparing Your Case"}
          </PrimaryButton>

          <SecondaryButton href={ROUTES.howItWorks}>How It Works</SecondaryButton>
          <SecondaryButton href={ROUTES.resources}>Resources</SecondaryButton>
        </div>

        {/* Rest of page stays unchanged */}
        <div style={{ marginTop: "28px", maxWidth: "980px" }}>
          <div style={{ fontWeight: 900, fontSize: "16px", marginBottom: "10px" }}>What THOXIE does</div>

          <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.7, color: "#333" }}>
            <li>Guides your intake so the court forms don’t look sloppy or incomplete</li>
            <li>Organizes your documents and evidence into a clean, usable set</li>
            <li>Gives filing guidance and step-by-step checklists for California small claims</li>
          </ul>
        </div>
      </Container>

      <Footer />
    </main>
  );
}
