// path: /app/_components/Footer.js

import { APP_META } from "../_config/appMeta";

export default function Footer() {
  return (
    <>
      {/* AI hint positioned left of chat button */}
      <div
        style={{
          position: "fixed",
          bottom: "26px",
          right: "140px", // places text left of the AI button
          fontSize: "24px", // double size
          fontWeight: "700",
          color: "#333",
          whiteSpace: "nowrap",
          zIndex: 9998,
        }}
      >
        Help with small-claims filings, evidence, and court steps →
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #eee",
          padding: "14px 20px",
          fontSize: "12px",
          color: "#666",
          textAlign: "center",
        }}
      >
        <div>© 2026 THOXIE. All rights reserved.</div>
      </footer>
    </>
  );
}
