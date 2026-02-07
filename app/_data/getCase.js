// path: /app/_data/getCase.js
import { MOCK_CASE } from "./mockCase";
import { MOCK_CASE_FILLED } from "./mockCaseFilled";

export function getCaseFromQuery(searchParams) {
  const sample = searchParams?.sample;
  if (sample === "1" || sample === "true" || sample === "filled") return MOCK_CASE_FILLED;
  return MOCK_CASE;
}

