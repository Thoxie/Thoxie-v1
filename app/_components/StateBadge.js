// path: /app/_components/StateBadge.js
import { CALIFORNIA_CONFIG } from "../_config/california";

export default function StateBadge() {
  return (
    <span
      style={{
        background: "#111",
        color: "#fff",
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 800,
      }}
    >
      {CALIFORNIA_CONFIG.name} Only
    </span>
  );
}

