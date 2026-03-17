/* PATH: app/_lib/ai/server/analyzeEvidencePacket.js */
/* FILE: analyzeEvidencePacket.js */
/* ACTION: FULL OVERWRITE */

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
  if (q.includes("weakest") || q.includes("weakness") || q.includes("missing") || q.includes("gap")) return "issue_spotting";
  if (q.includes("statute") || q.includes("code section") || q.includes("authority") || q.includes("case law")) return "authorities";
  if (q.includes("contradiction") || q.includes("inconsistent") || q.includes("conflict")) return "contradictions";
  if (q.includes("draft") || q.includes("rewrite") || q.includes("improve") || q.includes("revise")) return "drafting";
  if (q.includes("timeline") || q.includes("chronology") || q.includes("sequence")) return "chronology";
  if (q.includes("damage") || q.includes("cost") || q.includes("expense") || q.includes("amount")) return "damages";
  if (q.includes("claim") || q.includes("cause of action")) return "claims";
  if (q.includes("defense") || q.includes("oppose")) return "defenses";

  return "general";
}

function formatCitation(hit) {
  const citation = safeStr(hit?.citationLabel || "");
  if (citation) return citation;

  const docName = safeStr(hit?.docName || "Untitled document");
  const chunkIndex = Number(hit?.chunkIndex || 0);
  return `${docName} §${chunkIndex + 1}`;
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

  return uniqueItems(matches).slice(0, 16);
}

function extractMoney(text) {
  const matches = String(text || "").match(/\$\s?\d[\d,]*(?:\.\d{2})?/g) || [];
  return uniqueItems(matches).slice(0, 16);
}

function extractDates(text) {
  const matches =
    String(text || "").match(
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/gi
    ) || [];
  return uniqueItems(matches).slice(0, 16);
}

function detectDocumentType(text, docName = "", docType = "") {
  const explicit = safeStr(docType).toLowerCase();
  if (explicit) return explicit;

  const source = `${docName}\n${String(text || "")}`.toLowerCase();

  if (source.includes("declaration of")) return "declaration";
  if (source.includes("request for order")) return "request_for_order";
  if (source.includes("memorandum of points and authorities")) return "memorandum";
  if (source.includes("complaint")) return "complaint";
  if (source.includes("motion")) return "motion";
  if (source.includes("opposition")) return "opposition";
  if (source.includes("reply")) return "reply";
  if (source.includes("proof of service")) return "proof_of_service";
  if (source.includes("exhibit")) return "exhibit";
  if (source.includes("email") || source.includes("from:") || source.includes("subject:")) return "email";
  if (source.includes("invoice") || source.includes("statement")) return "financial_record";

  return "unknown";
}

function extractRoleAssignments(text) {
  const source = String(text || "");
  const results = [];
  const patterns = [
    { role: "plaintiff", regex: /\bPlaintiff\s*[:\-]\s*([A-Z][A-Za-z.,'&\- ]{1,90})/gi },
    { role: "defendant", regex: /\bDefendant\s*[:\-]\s*([A-Z][A-Za-z.,'&\- ]{1,90})/gi },
    { role: "petitioner", regex: /\bPetitioner\s*[:\-]\s*([A-Z][A-Za-z.,'&\- ]{1,90})/gi },
    { role: "respondent", regex: /\bRespondent\s*[:\-]\s*([A-Z][A-Za-z.,'&\- ]{1,90})/gi },
    { role: "declarant", regex: /\b([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+){1,3})\s+declares\b/g },
  ];

  for (const pattern of patterns) {
    let match = pattern.regex.exec(source);
    while (match) {
      const name = normalizeText(match[1]);
      if (name) results.push({ name, role: pattern.role });
      match = pattern.regex.exec(source);
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const item of results) {
    const key = `${item.name.toLowerCase()}::${item.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, 20);
}

function extractPartyCandidates(text) {
  return uniqueItems(extractRoleAssignments(text).map((item) => item.name)).slice(0, 12);
}

function extractReliefSignals(text) {
  const source = String(text || "");
  const matches = [];
  const patterns = [
    /\brequest(?:s|ed)?\s+that\s+[^.?!]{20,240}/gi,
    /\basks?\s+the\s+court\s+to\s+[^.?!]{20,240}/gi,
    /\bprayer\s+for\s+relief\b[^.?!]{0,240}/gi,
    /\bseeks?\s+[^.?!]{20,240}/gi,
    /\brelief\s+requested\b[^.?!]{0,240}/gi,
    /\bjudgment\s+for\s+[^.?!]{15,240}/gi,
  ];

  for (const pattern of patterns) {
    const found = source.match(pattern) || [];
    matches.push(...found);
  }

  return uniqueItems(matches).slice(0, 10);
}

function extractClaims(text) {
  const source = String(text || "");
  const matches = [];
  const patterns = [
    /\bbreach of contract\b/gi,
    /\bnegligence\b/gi,
    /\bfraud\b/gi,
    /\bmisrepresentation\b/gi,
    /\bbreach of fiduciary duty\b/gi,
    /\bwrongful eviction\b/gi,
    /\bproperty damage\b/gi,
    /\bunpaid rent\b/gi,
    /\bconversion\b/gi,
    /\bdefamation\b/gi,
    /\breimbursement\b/gi,
    /\brefund\b/gi,
    /\bdamages\b/gi,
    /\bclaim(?:s|ed)? that\b[^.?!]{10,160}/gi,
    /\bassert(?:s|ed)? that\b[^.?!]{10,160}/gi,
  ];

  for (const pattern of patterns) {
    const found = source.match(pattern) || [];
    matches.push(...found);
  }

  return uniqueItems(matches).slice(0, 12);
}

function extractDefenses(text) {
  const source = String(text || "");
  const matches = [];
  const patterns = [
    /\bden(?:y|ies|ied)\b[^.?!]{10,160}/gi,
    /\bdispute(?:s|d)?\b[^.?!]{10,160}/gi,
    /\boppose(?:s|d)?\b[^.?!]{10,160}/gi,
    /\bcontend(?:s|ed)?\b[^.?!]{10,160}/gi,
    /\bargue(?:s|d)?\b[^.?!]{10,160}/gi,
    /\baffirmative defense\b[^.?!]{0,160}/gi,
    /\black of standing\b/gi,
    /\bfailure to mitigate\b/gi,
    /\bstatute of limitations\b/gi,
    /\bno contract\b/gi,
    /\bnot liable\b/gi,
  ];

  for (const pattern of patterns) {
    const found = source.match(pattern) || [];
    matches.push(...found);
  }

  return uniqueItems(matches).slice(0, 12);
}

function extractMissingSupportSignals(text) {
  const source = String(text || "");
  const issues = [];

  if (!extractAuthorities(source).length) issues.push("No statute or case citation was detected in the retrieved packet.");
  if (!extractDates(source).length) issues.push("No explicit date was detected in the retrieved packet.");
  if (!extractMoney(source).length) issues.push("No explicit dollar figure was detected in the retrieved packet.");
  if (!/\b(exhibit|attachment|attached|see attached)\b/i.test(source)) {
    issues.push("No exhibit linkage language was detected in the retrieved packet.");
  }

  return issues;
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
      bullets.push(`[${formatCitation(hit)}] ${sentence}`);
      if (bullets.length >= 12) return bullets;
    }
  }

  return bullets;
}

function buildEvidenceCoverage(documents, hits) {
  const docCount = Array.isArray(documents) ? documents.length : 0;
  const docsWithText = (documents || []).filter((doc) => safeStr(doc?.extractedText)).length;
  const hitDocNames = uniqueItems((hits || []).map((hit) => hit?.docName));

  return {
    docCount,
    docsWithText,
    hitDocCount: hitDocNames.length,
    hitDocNames,
  };
}

function buildDocumentProfiles(hits) {
  const grouped = new Map();

  for (const hit of hits || []) {
    const key = safeStr(hit?.docId) || safeStr(hit?.docName) || "unknown-doc";
    if (!grouped.has(key)) {
      grouped.set(key, {
        docId: hit?.docId || "",
        docName: hit?.docName || "Untitled document",
        docType: hit?.docType || "",
        evidenceCategory: hit?.evidenceCategory || "",
        evidenceSupports: [],
        texts: [],
        citations: [],
        chunkKinds: [],
        sectionLabels: [],
      });
    }

    const entry = grouped.get(key);
    entry.texts.push(String(hit?.text || ""));
    entry.citations.push(formatCitation(hit));
    if (safeStr(hit?.chunkKind)) entry.chunkKinds.push(safeStr(hit.chunkKind));
    if (safeStr(hit?.sectionLabel)) entry.sectionLabels.push(safeStr(hit.sectionLabel));
    if (Array.isArray(hit?.evidenceSupports)) entry.evidenceSupports.push(...hit.evidenceSupports);
  }

  return Array.from(grouped.values()).map((entry) => {
    const combinedText = entry.texts.join("\n");
    const roles = extractRoleAssignments(combinedText);
    return {
      docId: entry.docId,
      docName: entry.docName,
      documentType: detectDocumentType(combinedText, entry.docName, entry.docType),
      evidenceCategory: safeStr(entry.evidenceCategory),
      evidenceSupports: uniqueItems(entry.evidenceSupports).slice(0, 6),
      parties: uniqueItems(roles.map((item) => item.name)).slice(0, 8),
      partyRoles: roles.slice(0, 8),
      claims: extractClaims(combinedText),
      defenses: extractDefenses(combinedText),
      requestedRelief: extractReliefSignals(combinedText),
      dates: extractDates(combinedText),
      moneyValues: extractMoney(combinedText),
      authorities: extractAuthorities(combinedText),
      citations: uniqueItems(entry.citations).slice(0, 4),
      chunkKinds: uniqueItems(entry.chunkKinds).slice(0, 4),
      sectionLabels: uniqueItems(entry.sectionLabels).slice(0, 5),
    };
  });
}

function detectContradictions(hits) {
  const tensions = [];
  const moneyByDoc = new Map();
  const datesByDoc = new Map();
  const reliefByDoc = new Map();

  for (const hit of hits || []) {
    const docKey = safeStr(hit?.docName) || safeStr(hit?.docId) || "Unknown document";
    moneyByDoc.set(docKey, uniqueItems([...(moneyByDoc.get(docKey) || []), ...extractMoney(hit?.text || "")]));
    datesByDoc.set(docKey, uniqueItems([...(datesByDoc.get(docKey) || []), ...extractDates(hit?.text || "")]));
    reliefByDoc.set(docKey, uniqueItems([...(reliefByDoc.get(docKey) || []), ...extractReliefSignals(hit?.text || "")]));
  }

  const distinctMoneySets = uniqueItems(Array.from(moneyByDoc.values()).flat());
  if (distinctMoneySets.length >= 2 && moneyByDoc.size >= 2) {
    tensions.push(`Multiple dollar figures appear across retrieved documents: ${distinctMoneySets.slice(0, 5).join(", ")}.`);
  }

  const distinctDates = uniqueItems(Array.from(datesByDoc.values()).flat());
  if (distinctDates.length >= 2 && datesByDoc.size >= 2) {
    tensions.push(`Multiple potentially material dates appear across retrieved documents: ${distinctDates.slice(0, 5).join(", ")}.`);
  }

  const distinctRelief = uniqueItems(Array.from(reliefByDoc.values()).flat());
  if (distinctRelief.length >= 2 && reliefByDoc.size >= 2) {
    tensions.push("Different requested-relief formulations appear across the retrieved documents.");
  }

  return tensions.slice(0, 8);
}

function buildIssueMap(documentProfiles) {
  const issueMap = [];

  for (const profile of documentProfiles || []) {
    const issues = [];

    if ((profile.claims || []).length > 0 && (profile.requestedRelief || []).length === 0) {
      issues.push("Claim language appears without clear requested-relief language.");
    }

    if ((profile.requestedRelief || []).length > 0 && (profile.moneyValues || []).length === 0) {
      issues.push("Requested relief appears without a specific dollar figure in the retrieved text.");
    }

    if ((profile.claims || []).length > 0 && (profile.dates || []).length === 0) {
      issues.push("Claim language appears with weak date anchoring.");
    }

    if ((profile.claims || []).length > 0 && (profile.authorities || []).length === 0) {
      issues.push("Claim language appears without a detected legal authority in the retrieved text.");
    }

    if (issues.length > 0) {
      issueMap.push({
        docName: profile.docName,
        documentType: profile.documentType,
        issues: uniqueItems(issues).slice(0, 5),
      });
    }
  }

  return issueMap.slice(0, 8);
}

function detectGaps({
  queryType,
  documents,
  hits,
  authorities,
  moneyValues,
  dates,
  requestedRelief,
  claims,
  defenses,
  documentProfiles,
}) {
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

  if (moneyValues.length === 0 && (queryType === "damages" || requestedRelief.length > 0)) {
    issues.push("No specific dollar amount was detected in the retrieved evidence.");
  }

  if (dates.length === 0 && (queryType === "chronology" || queryType === "issue_spotting")) {
    issues.push("The retrieved evidence has limited explicit date anchoring.");
  }

  if ((requestedRelief || []).length === 0 && (queryType === "issue_spotting" || queryType === "drafting")) {
    issues.push("No clear request-for-relief language was detected in the retrieved evidence.");
  }

  if ((claims || []).length === 0 && queryType === "claims") {
    issues.push("No explicit claim language was detected in the retrieved evidence.");
  }

  if ((defenses || []).length === 0 && queryType === "defenses") {
    issues.push("No explicit defense language was detected in the retrieved evidence.");
  }

  if (textLength > 0 && textLength < 1200) {
    issues.push("The available document text is short, which limits issue spotting and drafting depth.");
  }

  const hitDocCount = uniqueItems((hits || []).map((hit) => hit?.docId)).length;
  if (docsWithText.length > 1 && hitDocCount === 1) {
    issues.push("Only one document is materially represented in the retrieved evidence, even though multiple documents have stored text.");
  }

  const docProfilesWithClaims = (documentProfiles || []).filter((profile) => (profile.claims || []).length > 0);
  if (docProfilesWithClaims.length > 0) {
    const claimDocsWithoutSupport = docProfilesWithClaims.filter(
      (profile) => (profile.requestedRelief || []).length === 0 || (profile.moneyValues || []).length === 0
    );
    if (claimDocsWithoutSupport.length > 0) {
      issues.push("At least one retrieved document appears to state a claim or accusation without fully supported relief details.");
    }
  }

  return uniqueItems(issues).slice(0, 10);
}

export function analyzeEvidencePacket({ query, hits, documents }) {
  const queryType = classifyQuery(query);
  const combinedHitText = (hits || []).map((hit) => hit?.text || "").join("\n");
  const factBullets = buildFactBullets(hits);
  const coverage = buildEvidenceCoverage(documents, hits);
  const authorities = extractAuthorities(combinedHitText);
  const moneyValues = extractMoney(combinedHitText);
  const dates = extractDates(combinedHitText);
  const partyRoles = extractRoleAssignments(combinedHitText);
  const parties = uniqueItems(partyRoles.map((item) => item.name)).slice(0, 12);
  const requestedRelief = extractReliefSignals(combinedHitText);
  const claims = extractClaims(combinedHitText);
  const defenses = extractDefenses(combinedHitText);
  const contradictions = detectContradictions(hits);
  const documentProfiles = buildDocumentProfiles(hits);
  const issueMap = buildIssueMap(documentProfiles);
  const missingSupport = extractMissingSupportSignals(combinedHitText);
  const gaps = detectGaps({
    queryType,
    documents,
    hits,
    authorities,
    moneyValues,
    dates,
    requestedRelief,
    claims,
    defenses,
    documentProfiles,
  });
  const combinedGaps = uniqueItems([...(gaps || []), ...(missingSupport || [])]).slice(0, 12);

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

  if (documentProfiles.length > 0) {
    lines.push("DOCUMENT_PROFILES");
    documentProfiles.slice(0, 8).forEach((profile, idx) => {
      const parts = [`${idx + 1}. ${profile.docName}`, `type=${profile.documentType}`];
      if (profile.evidenceCategory) parts.push(`category=${profile.evidenceCategory}`);
      if (profile.citations.length > 0) parts.push(`citations=${profile.citations.join(", ")}`);
      if (profile.sectionLabels.length > 0) parts.push(`sections=${profile.sectionLabels.join(" | ")}`);
      if (profile.chunkKinds.length > 0) parts.push(`chunkKinds=${profile.chunkKinds.join(", ")}`);
      if (profile.parties.length > 0) parts.push(`parties=${profile.parties.slice(0, 4).join(", ")}`);
      if (profile.claims.length > 0) parts.push(`claims=${profile.claims.slice(0, 3).join(" | ")}`);
      if (profile.defenses.length > 0) parts.push(`defenses=${profile.defenses.slice(0, 3).join(" | ")}`);
      if (profile.requestedRelief.length > 0) parts.push(`relief=${profile.requestedRelief.slice(0, 2).join(" | ")}`);
      lines.push(parts.join(" | "));
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

  if (partyRoles.length > 0) {
    lines.push("PARTIES_AND_ROLES");
    partyRoles.slice(0, 12).forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.name} — ${item.role}`);
    });
    lines.push("");
  } else if (parties.length > 0) {
    lines.push("PARTIES_DETECTED");
    parties.slice(0, 8).forEach((party, idx) => {
      lines.push(`${idx + 1}. ${party}`);
    });
    lines.push("");
  }

  if (claims.length > 0) {
    lines.push("CLAIMS_OR_THEORIES_DETECTED");
    claims.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item}`);
    });
    lines.push("");
  }

  if (defenses.length > 0) {
    lines.push("DEFENSES_OR_RESISTANCE_DETECTED");
    defenses.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item}`);
    });
    lines.push("");
  }

  if (requestedRelief.length > 0) {
    lines.push("RELIEF_LANGUAGE_DETECTED");
    requestedRelief.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item}`);
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
    if (moneyValues.length > 0) lines.push(`moneyValues: ${moneyValues.join(", ")}`);
    if (dates.length > 0) lines.push(`dates: ${dates.join(", ")}`);
    lines.push("");
  }

  if (issueMap.length > 0) {
    lines.push("ISSUE_LINKAGE");
    issueMap.forEach((entry, idx) => {
      lines.push(`${idx + 1}. ${entry.docName} (${entry.documentType})`);
      entry.issues.forEach((issue, issueIdx) => {
        lines.push(`   ${String.fromCharCode(97 + issueIdx)}. ${issue}`);
      });
    });
    lines.push("");
  }

  if (combinedGaps.length > 0) {
    lines.push("POTENTIAL_GAPS_OR_WEAK_POINTS");
    combinedGaps.forEach((gap, idx) => {
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
    parties,
    partyRoles,
    claims,
    defenses,
    requestedRelief,
    documentProfiles,
    issueMap,
    gaps: combinedGaps,
    contradictions,
    packetText: lines.join("\n").trim(),
  };
}
