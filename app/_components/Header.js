// Path: /app/_components/Header.js

"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        width: "100%",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 20px"
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center"
          }}
        >
          <img
            src="/small-claims-genie-logo.png.jpg"
            alt="Small Claims Genie"
            style={{
              height: "130px",
              width: "auto",
              display: "block",
              cursor: "pointer"
            }}
          />
        </Link>

        <nav
          style={{
            display: "flex",
            gap: "28px",
            alignItems: "center"
          }}
        >
          <Link href="/how-it-works" style={navLink}>
            How It Works
          </Link>

          <Link href="/types-of-cases" style={navLink}>
            Types of Cases
          </Link>

          <Link href="/faq" style={navLink}>
            FAQ
          </Link>

          <Link href="/case-dashboard" style={navLink}>
            Dashboard
          </Link>

          <Link href="/resources" style={navLink}>
            Resources
          </Link>
        </nav>
      </div>
    </header>
  );
}

const navLink = {
  color: "#1d4ed8",
  fontWeight: 600,
  textDecoration: "none",
  fontSize: "16px"
};
