// Path: /app/_lib/ai/server/rateLimit.js
/**
 * Minimal in-memory rate limiter + beta allowlist helpers.
 * No external deps. Safe for Vercel serverless (best-effort).
 */

const STORE_KEY = "__thoxie_rate_limit_store_v1__";

function getStore() {
  // Best-effort: serverless instances may not share memory; still useful per-instance.
  if (!globalThis[STORE_KEY]) globalThis[STORE_KEY] = new Map();
  return globalThis[STORE_KEY];
}

export function getClientIp(req) {
  try {
    const h = req?.headers;
    const xff = h?.get?.("x-forwarded-for");
    if (xff) return String(xff).split(",")[0].trim();
    const xrip = h?.get?.("x-real-ip");
    if (xrip) return String(xrip).trim();
    const cf = h?.get?.("cf-connecting-ip");
    if (cf) return String(cf).trim();
  } catch {
    // ignore
  }
  return "unknown";
}

export function normalizeTesterId(v) {
  return String(v || "").trim().toLowerCase();
}

export function parseAllowlist(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];
  return s
    .split(",")
    .map((x) => normalizeTesterId(x))
    .filter(Boolean);
}

export function isKillSwitchEnabled() {
  // Default: enabled unless explicitly turned off.
  const v = String(process.env.THOXIE_AI_ENABLED || "1").trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  return true;
}

export function getRateLimitConfig() {
  const perMin = parseInt(String(process.env.THOXIE_AI_RATE_LIMIT_PER_MIN || "0"), 10);
  const windowSec = parseInt(String(process.env.THOXIE_AI_RATE_LIMIT_WINDOW_SEC || "60"), 10);
  return {
    perMin: Number.isFinite(perMin) ? perMin : 0,
    windowSec: Number.isFinite(windowSec) && windowSec > 0 ? windowSec : 60
  };
}

export function checkRateLimit({ key, limit, windowSec }) {
  const lim = Number(limit || 0);
  const win = Number(windowSec || 60);

  // If not configured, treat as unlimited.
  if (!Number.isFinite(lim) || lim <= 0) return { ok: true, remaining: Infinity, resetInSec: win };

  const store = getStore();
  const now = Date.now();
  const resetAt = now + win * 1000;

  const prev = store.get(key);
  if (!prev || typeof prev !== "object" || !prev.resetAt || now >= prev.resetAt) {
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: lim - 1, resetInSec: win };
  }

  const count = (prev.count || 0) + 1;
  prev.count = count;
  store.set(key, prev);

  const remaining = lim - count;
  const resetInSec = Math.max(0, Math.ceil((prev.resetAt - now) / 1000));

  if (count > lim) {
    return { ok: false, remaining: 0, resetInSec };
  }

  return { ok: true, remaining, resetInSec };
}


