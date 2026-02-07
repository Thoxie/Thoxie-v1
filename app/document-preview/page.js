// path: /app/document-preview/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import { MOCK_CASE } from "../_data/mockCase";

export default function DocumentPreviewPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section style={{ padding: "24px", fontFamily: "system-ui, sans-serif", flex: 1 }}>
        <h1 style={{ marginTop: 0 }}>Document Preview (Mock Packet)</h1>

        <div style={{ maxWidth: "920px" }}>
          <div style={box}>
            <div style={title}>California Small Claims — Draft Packet</div>

            <div style={row}>
              <div style={label}>Status</div>
              <div style={value}>{MOCK_CASE.status}</div>
            </div>

            <div style={row}>
              <div style={label}>County</div>
              <div style={value}>{MOCK_CASE.county || "(not set)"}</div>
            </div>

            <div style={row}>
              <div style={label}>Claim Amount</div>
              <div style={value}>{MOCK_CASE.claimAmount || "(not set)"}</div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "14px 0" }} />

            <div style={sectionTitle}>Parties</div>
            <div style={paragraph}>
              Plaintiff: <strong>{MOCK_CASE.parties.plaintiff || "(not set)"}</strong>
              <br />
              Defendant: <strong>{MOCK_CASE.parties.defendant || "(not set)"}</strong>
            </div>

            <div style={sectionTitle}>Facts</div>
            <div style={paragraph}>{MOCK_CASE.facts || "Placeholder…"}</div>

            <div style={sectionTitle}>Damages</div>
            <div style={paragraph}>{MOCK_CASE.damages || "Placeholder…"}</div>

            <div style={sectionTitle}>Exhibits</div>
            <div style={paragraph}>
              {MOCK_CASE.exhibits.length ? "Exhibits listed here…" : "None yet (placeholder)."}
            </div>
          </div>

          <div style={{ marginTop: "18px" }}>
            <a href={ROUTES.dashboard} style={btn}>
              Back to Dashboard
            </a>
            <a href={ROUTES.start} style={{ ...btn, marginLeft: "12px" }}>
              Edit Intake
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

const box = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "16px 18px",
  background: "#fff",
};

const title = { fontWeight: 900, fontSize: "16px", marginBottom: "10px" };

const row = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: "12px",
  padding: "6px 0",
};

const label = { color: "#555", fontWeight: 800, fontSize: "13px" };
const value = { color: "#111", fontWeight: 700 };

const sectionTitle = { marginTop: "14px", fontWeight: 900, fontSize: "14px" };
const paragraph = { marginTop: "6px", lineHeight: 1.7, color: "#222" };

const btn = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: 800,
  border: "2px solid #111",
  color: "#111",
};
