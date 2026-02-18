// Path: /app/_lib/rag/hash.js

import crypto from "crypto";

export function sha256Hex(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input || ""), "utf8");
  return crypto.createHash("sha256").update(buf).digest("hex");
}

