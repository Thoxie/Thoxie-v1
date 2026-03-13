// /app/_components/Header.js

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
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 20px",
          minHeight: "120px"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: "0 0 auto"
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none"
            }}
          >
            <img
              src="/small-claims-genie-logo.png"
              alt="Small Claims Genie"
              style={{
                height: "96px",
                width: "auto",
                display: "block",
                cursor: "pointer"
              }}
            />
          </Link>
        </div>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "40px",
            flex: "1 1 auto",
            minHeight: "96px"
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

          <Link href="/ai-chatbox" style={askButton}>
            Ask the Genie
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
  fontSize: "16px",
  display: "inline-flex",
  alignItems: "center",
  height: "44px"
};

const askButton = {
  background: "#1d4ed8",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "10px",
  fontWeight: 600,
  textDecoration: "none",
  fontSize: "15px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "44px"
};
