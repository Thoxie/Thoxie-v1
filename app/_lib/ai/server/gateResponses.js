// Path: /app/_lib/ai/server/gateResponses.js

/**
 * Centralized refusal / redirect responses.
 * Keeps messaging consistent and editable.
 */

export const GateResponses = {
  off_topic: `
I’m designed to help with California small-claims matters only.

I can assist with:
• Filing or responding to a claim  
• Evidence organization  
• Court procedures  
• Case preparation  
• Settlement strategy  

Please ask a question related to your small-claims case.
`.trim(),

  empty: `
Please enter a question or describe your dispute so I can help you prepare your small-claims case.
`.trim(),

  admin: `
I can help with THOXIE case preparation features.  
If you’re having a technical issue, describe what isn’t working.
`.trim()
};

