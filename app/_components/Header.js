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
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",

          // creates space above and below logo so it is not clipped
          padding: "20px 20px 28px 20px"
        }}
      >
        {/* LOGO */}

        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            flex: "0 0 auto"
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

        {/* NAVIGATION */}

        <nav
          style={{
            display: "flex",
            gap: "32px",
            alignItems: "center",
            justifyContent: "flex-end",
            flex: "1"
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
  alignItems: "center"
};

const askButton = {
  background: "#1d4ed8",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "6px",
  fontWeight: 600,
  textDecoration: "none",
  fontSize: "15px",
  display: "inline-flex",
  alignItems: "center"
};
