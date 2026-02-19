// Path: /app/_lib/ai/server/aiConfig.js
/**
 * Server-only AI configuration.
 *
 * Build-safe: never throws if env vars are missing.
 *
 * Env:
 *  - THOXIE_AI_PROVIDER=openai
 *  - THOXIE_OPENAI_API_KEY=...
 *  - THOXIE_OPENAI_MODEL=gpt-4o-mini (optional)
 *  - THOXIE_OPENAI_TIMEOUT_MS=20000 (optional)
 */
export function getAIConfig() {
  const provider = (process.env.THOXIE_AI_PROVIDER || "").toLowerCase().trim() || "none";

  const apiKey = process.env.THOXIE_OPENAI_API_KEY || "";
  const model = process.env.THOXIE_OPENAI_MODEL || "gpt-4o-mini";
  const timeoutMs = parseInt(process.env.THOXIE_OPENAI_TIMEOUT_MS || "20000", 10);

  return {
    provider,
    openai: {
      apiKey,
      model,
      timeoutMs,
    },

    // Backward-compatible fields (safe to keep)
    openaiApiKey: apiKey,
    openaiModel: model,
    openaiTimeoutMs: timeoutMs,
  };
}

export function isLiveAIEnabled(cfg) {
  if (!cfg || typeof cfg !== "object") return false;
  if (cfg.provider !== "openai") return false;
  if (!cfg.openai || !cfg.openai.apiKey) return false;
  return true;
}

