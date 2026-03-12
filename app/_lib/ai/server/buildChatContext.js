// path: /app/_lib/ai/server/buildChatContext.js

export function buildChatContext({
  caseData = {},
  documents = [],
  retrievedChunks = [],
}) {
  const caseSummary = `
CASE INFORMATION
Case Name: ${caseData.case_name || "Unknown"}
Jurisdiction: ${caseData.jurisdiction || "Unknown"}
Case Type: ${caseData.case_type || "Unknown"}
`;

  const documentInventory = documents
    .map((doc) => `- ${doc.name}`)
    .join("\n");

  const evidence = retrievedChunks
    .map(
      (chunk) =>
        `[Document: ${chunk.name} | Chunk ${chunk.chunk_index}]
${chunk.chunk_text}`
    )
    .join("\n\n");

  const context = `
DOCUMENT EVIDENCE (PRIORITY)
${evidence}

DOCUMENT INVENTORY
${documentInventory}

CASE BACKGROUND
${caseSummary}
`;

  return context;
}
