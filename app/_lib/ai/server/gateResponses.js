/* 2. PATH: app/_lib/ai/server/gateResponses.js */
/* 2. FILE: gateResponses.js */
/* 2. ACTION: OVERWRITE */

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
I can help with THOXIE account or platform issues.

Examples:
• upload failed
• file will not open
• case is missing
• login or account issue

If you want me to review or summarize an uploaded document, ask that directly and I will treat it as an evidence question.
`.trim()
};

