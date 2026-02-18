// Path: /app/ai/chat/route.js
/**
 * POST /ai/chat
 * Back-compat endpoint.
 * Delegates to canonical /api/chat handler to avoid drift.
 */
export { POST } from "../../api/chat/route";


