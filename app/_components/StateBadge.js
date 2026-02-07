// path: /app/_components/StateBadge.js
import { CALIFORNIA_CONFIG } from "../_config/california";

export default function StateBadge() {
  return (
    <span
      style={{
        background: "rgba(255,255,255,0.18)",
        color: "#fff",
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 900,
        border: "1px solid rgba(255,255,255,0.35)",
      }}
    >
      {CALIFORNIA_CONFIG.name} Only
    </span>
  );
}

