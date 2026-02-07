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
      <div>{APP_META.appName} — {APP_META.scope}</div>
      <div style={{ marginTop: "6px" }}>{APP_META.disclaimer}</div>
    </footer>
  );
}

