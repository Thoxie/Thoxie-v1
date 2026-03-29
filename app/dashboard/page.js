// PATH: /app/dashboard/page.js
// DIRECTORY: /app/dashboard
// FILE: page.js
// ACTION: FULL OVERWRITE

import { redirect } from "next/navigation";

const CANONICAL_DASHBOARD_PATH = "/case-dashboard";

function buildRedirectTarget(searchParams) {
  if (searchParams instanceof URLSearchParams) {
    const query = searchParams.toString();
    return query
      ? `${CANONICAL_DASHBOARD_PATH}?${query}`
      : CANONICAL_DASHBOARD_PATH;
  }

  const params = new URLSearchParams();

  if (searchParams && typeof searchParams === "object") {
    for (const [key, rawValue] of Object.entries(searchParams)) {
      if (rawValue == null) continue;

      if (Array.isArray(rawValue)) {
        for (const value of rawValue) {
          if (value == null) continue;
          params.append(key, String(value));
        }
        continue;
      }

      params.set(key, String(rawValue));
    }
  }

  const query = params.toString();

  return query
    ? `${CANONICAL_DASHBOARD_PATH}?${query}`
    : CANONICAL_DASHBOARD_PATH;
}

export default async function DashboardPage({ searchParams }) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  redirect(buildRedirectTarget(resolvedSearchParams));
}
