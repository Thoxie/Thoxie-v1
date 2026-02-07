// path: /app/how-it-works/page.js
import Header from "../_components/Header";

export default function HowItWorksPage() {
  return (
    <main>
      <Header />

      <section style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ marginTop: 0 }}>How It Works (Mock-up)</h1>

        <ol style={{ lineHeight: 1.8, maxWidth: "640px" }}>
          <li>California-only in v1.</li>
          <li>Answer guided intake questions.</li>
          <li>Upload evidence and documents.</li>
          <li>Preview a draft packet and checklist.</li>
        </ol>

        <p>This page is a placeholder. Functionality will be added next.</p>
      </section>
    </main>
  );
}

