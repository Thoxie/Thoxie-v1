// path: /app/_components/Footer.js

import { APP_META } from "../_config/appMeta";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid #eee",
        padding: "14px 20px",
        fontSize: "12px",
        color: "#666",
        textAlign: "center",
      }}
    >
      {/* AI hint text */}
      <div style={{ marginBottom: "6px", fontSize: "13px", color: "#444" }}>
        Help with small-claims filings, evidence, and court steps &gt;
      </div>

      {/* Copyright */}
      <div>© 2026 THOXIE. All rights reserved.</div>
    </footer>
  );
}
