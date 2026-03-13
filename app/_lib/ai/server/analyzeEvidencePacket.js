/* PATH: app/_lib/ai/server/analyzeEvidencePacket.js */
/* FILE: analyzeEvidencePacket.js */
/* ACTION: NEW FILE */

function safeStr(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value) {
  return safeStr(String(value || "").replace(/\s+/g, " "));
}

function uniqueItems(values) {
  const out = [];
  const seen = new Set();

  for (const value of values || []) {
    const cleaned = normalizeText(value);
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }

  return out;
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function classifyQuery(query) {
  const q = safeStr(query).toLowerCase();

  if (!q) return "general";
  if (q.includes("weakest") || q.includes("weakness") || q.includes("missing") || q.includes("gap")) {
    return "issue_spotting";
  }
  if (q.includes("statute") || q.includes("code section") || q.includes("authority") || q.includes("case law")) {
    return "authorities";
  }
  if (q.includes("contradiction") || q.includes("inconsistent") || q.includes("conflict")) {
    return "contradictions";
  }
  if (q.includes("draft") || q.includes("rewrite") || q.includes("improve") || q.includes("revise")) {
    return "drafting";
  }
  if (q.includes("timeline") || q.includes("chronology") || q.includes("sequence")) {
    return "chronology";
  }
  if (q.includes("damage") || q.includes("cost") || q.includes("expense") || q.includes("amount")) {
    return "damages";
  }

  return "general";
}

function extractAuthorities(text) {
  const source = String(text || "");
  const matches = [];
  const patterns = [
    /(?:Code\s+Civ\.\s+Proc\.|Code\s+of\s+Civil\s+Procedure|Civil\s+Code|Evidence\s+Code|Gov(?:ernment)?\.?\s*Code|Penal\s+Code|Bus(?:iness)?\.?\s*&?\s*Prof(?:essions)?\.?\s*Code|Family\s+Code)\s*(?:section|sections|§{1,2})?\s*[0-9][0-9A-Za-z().,-]*/gi,
    /In\s+re\s+[A-Z][A-Za-z\s.]+\([0-9]{4}\)/g,
    /[A-Z][A-Za-z.&'\-\s]+v\.\s+[A-Z][A-Za-z.&'\-\s]+\([0-9]{4}\)/g,
  ];

  for (const pattern of patterns) {
    const found = source.match(pattern) || [];
    matches.push(...found);
  }

  return uniqueItems(matches).slice(0, 12);
}

function extractMoney(text) {
  const matches = String(text || "").match(/\$\s?\d[\d,]*(?:\.\d{2})?/g) || [];
  return uniqueItems(matches).slice(0, 12);
}

function extractDates(text) {
  const matches =
    String(text || "").match(
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/gi
    ) || [];
  return uniqueItems(matches).slice(0, 12);
}

function buildFactBullets(hits) {
  const bullets = [];
  const seen = new Set();

  for (const hit of hits || []) {
    const sentences = splitSentences(hit?.text || "");

    for (const sentence of sentences) {
      if (sentence.length < 35) continue;
      const key = sentence.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      bullets.push(`[${hit.docName}] ${sentence}`);
      if (bullets.length >= 10) return bullets;
    }
  }

  return bullets;
}

function buildEvidenceCoverage(documents, hits) {
  const docCount = Array.isArray(documents) ? documents.length : 0;
  const docsWithText = (documents || []).filter((doc) => safeStr(doc?.extractedText)).length;
  const hitDocs = uniqueItems((hits || []).map((hit) => hit?.docName));

  return {
    docCount,
    docsWithText,
    hitDocCount: hitDocs.length,
    hitDocNames: hitDocs,
  };
}

function detectGaps({ queryType, documents, hits, authorities, moneyValues, dates }) {
  const issues = [];
  const docsWithText = (documents || []).filter((doc) => safeStr(doc?.extractedText));
  const textLength = docsWithText.reduce((sum, doc) => sum + safeStr(doc?.extractedText).length, 0);

  if ((hits || []).length === 0) {
    issues.push("No retrievable evidence passages were found for this question.");
    return issues;
  }

  if (
    authorities.length === 0 &&
    (queryType === "authorities" || queryType === "issue_spotting" || queryType === "drafting")
  ) {
    issues.push("No statutory or case citations were detected in the retrieved evidence.");
  }

  if (authorities.length === 1 && (queryType === "authorities" || queryType === "issue_spotting")) {
    issues.push(`Only one authority was detected in the retrieved evidence: ${authorities[0]}.`);
  }

  if (moneyValues.length === 0 && queryType === "damages") {
    issues.push("No specific dollar amount was detected in the retrieved evidence.");
  }

  if (dates.length === 0 && (queryType === "chronology" || queryType === "issue_spotting")) {
    issues.push("The retrieved evidence has limited explicit date anchoring.");
  }

  if (textLength > 0 && textLength < 1200) {
    issues.push("The available document text is short, which limits issue spotting and drafting depth.");
  }

  const hitDocCount = uniqueItems((hits || []).map((hit) => hit?.docId)).length;
  if (docsWithText.length > 1 && hitDocCount === 1) {
    issues.push(
      "Only one document is materially represented in the retrieved evidence, even though multiple documents have stored text."
    );
  }

  return uniqueItems(issues).slice(0, 8);
}

function detectContradictions(hits) {
  const tensions = [];
  const moneyByDoc = new Map();
  const datesByDoc = new Map();

  for (const hit of hits || []) {
    const docKey = safeStr(hit?.docName) || safeStr(hit?.docId) || "Unknown document";
    moneyByDoc.set(docKey, uniqueItems([...(moneyByDoc.get(docKey) || []), ...extractMoney(hit?.text || "")]));
    datesByDoc.set(docKey, uniqueItems([...(datesByDoc.get(docKey) || []), ...extractDates(hit?.text || "")]));
  }

  const distinctMoneySets = uniqueItems(Array.from(moneyByDoc.values()).flat());
  if (distinctMoneySets.length >= 2 && moneyByDoc.size >= 2) {
    tensions.push(`Multiple dollar figures appear across retrieved documents: ${distinctMoneySets.slice(0, 4).join(", ")}.`);
  }

  const distinctDates = uniqueItems(Array.from(datesByDoc.values()).flat());
  if (distinctDates.length >= 2 && datesByDoc.size >= 2) {
    tensions.push(`Multiple potentially material dates appear across retrieved documents: ${distinctDates.slice(0, 4).join(", ")}.`);
  }

  return tensions.slice(0, 6);
}

export function analyzeEvidencePacket({ query, hits, documents }) {
  const queryType = classifyQuery(query);
  const factBullets = buildFactBullets(hits);
  const coverage = buildEvidenceCoverage(documents, hits);
  const authorities = extractAuthorities((hits || []).map((hit) => hit?.text || "").join("\n"));
  const moneyValues = extractMoney((hits || []).map((hit) => hit?.text || "").join("\n"));
  const dates = extractDates((hits || []).map((hit) => hit?.text || "").join("\n"));
  const contradictions = detectContradictions(hits);
  const gaps = detectGaps({ queryType, documents, hits, authorities, moneyValues, dates });

  const lines = [];
  lines.push("EVIDENCE_PACKET");
  lines.push(`queryType: ${queryType}`);
  lines.push(`documentsOnFile: ${coverage.docCount}`);
  lines.push(`documentsWithStoredText: ${coverage.docsWithText}`);
  lines.push(`documentsRepresentedInRetrievedEvidence: ${coverage.hitDocCount}`);
  lines.push("");

  if (coverage.hitDocNames.length > 0) {
    lines.push("EVIDENCE_DOCUMENTS");
    coverage.hitDocNames.forEach((name, idx) => {
      lines.push(`${idx + 1}. ${name}`);
    });
    lines.push("");
  }

  if (factBullets.length > 0) {
    lines.push("KEY_FACTS");
    factBullets.forEach((fact, idx) => {
      lines.push(`${idx + 1}. ${fact}`);
    });
    lines.push("");
  }

  if (authorities.length > 0) {
    lines.push("AUTHORITIES_ALREADY_IN_EVIDENCE");
    authorities.forEach((authority, idx) => {
      lines.push(`${idx + 1}. ${authority}`);
    });
    lines.push("");
  }

  if (moneyValues.length > 0 || dates.length > 0) {
    lines.push("STRUCTURED_FACTS");
    if (moneyValues.length > 0) {
      lines.push(`moneyValues: ${moneyValues.join(", ")}`);
    }
    if (dates.length > 0) {
      lines.push(`dates: ${dates.join(", ")}`);
    }
    lines.push("");
  }

  if (gaps.length > 0) {
    lines.push("POTENTIAL_GAPS_OR_WEAK_POINTS");
    gaps.forEach((gap, idx) => {
      lines.push(`${idx + 1}. ${gap}`);
    });
    lines.push("");
  }

  if (contradictions.length > 0) {
    lines.push("POTENTIAL_CROSS_DOCUMENT_TENSIONS");
    contradictions.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item}`);
    });
    lines.push("");
  }

  return {
    queryType,
    hasGroundedEvidence: factBullets.length > 0,
    factBullets,
    authorities,
    moneyValues,
    dates,
    gaps,
    contradictions,
    packetText: lines.join("\n").trim(),
  };
}
