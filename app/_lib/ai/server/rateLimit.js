// Path: /app/_lib/ai/server/rateLimit.js

/**
 * Best-effort in-memory rate limiter.
 * Works well enough for a controlled beta, but note:
 * - Vercel serverless instances may not share memory across regions/instances.
 * - This is still useful to prevent runaway loops + basic abuse.
 */

const GLOBAL_KEY = "__thoxie_rate_limit_map_v1__";

function getStore() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = new Map();
  }
  return globalThis[GLOBAL_KEY];
}

export function parseCsvAllowlist(csv) {
  const raw = String(csv || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function getClientIp(req) {
  try {
    const xf = req?.headers?.get?.("x-forwarded-for") || "";
    if (xf) return xf.split(",")[0].trim() || "unknown";
    const xr = req?.headers?.get?.("x-real-ip") || "";
    if (xr) return xr.trim() || "unknown";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function checkRateLimit({ key, limit, windowMs }) {
  const lim = Math.max(1, Number(limit || 20));
  const win = Math.max(1000, Number(windowMs || 60000));
  const now = Date.now();

  const store = getStore();
  const row = store.get(key) || { hits: [] };

  // keep only hits within window
  row.hits = row.hits.filter((ts) => now - ts < win);

  if (row.hits.length >= lim) {
    const oldest = row.hits[0] || now;
    const retryAfterMs = Math.max(0, win - (now - oldest));
    store.set(key, row);
    return {
      ok: false,
      retryAfterSec: Math.ceil(retryAfterMs / 1000)
    };
  }

  row.hits.push(now);
  store.set(key, row);

  return { ok: true, retryAfterSec: 0 };
}

