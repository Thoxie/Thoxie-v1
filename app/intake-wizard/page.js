// Path: /app/intake-wizard/page.js

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import IntakeWizardClient from "./IntakeWizardClient";

export default function IntakeWizardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "16px" }}>Loading…</div>}>
      <IntakeWizardClient />
    </Suspense>
  );
}
