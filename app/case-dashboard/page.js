// path: /app/case-dashboard/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import { ROUTES } from "../_config/routes";
import { MOCK_CASE } from "../_data/mockCase";

export default function CaseDashboardPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section style={{ padding: "24px", fontFamily: "system-ui, sans-serif", flex: 1 }}>
        <h1 style={{ marginTop: 0 }}>Case Dashboard (Mock-up)</h1>

        <div style={{ maxWidth: "860px" }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <div style={{ fontWeight: 900 }}>California Small Claims</div>
                <div style={{ color: "#444", marginTop: "6px", lineHeight: 1.6 }}>
                  Status: <strong>{MOCK_CASE.status}</strong>
                  <br />
                  County: <strong>{MOCK_CASE.county || "(not set)"}</strong>
                  <br />
                  Claim Amount: <strong>{MOCK_CASE.claimAmount || "(not set)"}</strong>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <a href={ROUTES.start} style={btnPrimary}>
                  Continue Intake
                </a>
                <a href={ROUTES.preview} style={btnSecondary}>
                  Open Preview
                </a>
              </div>
            </div>
          </div>

          <div style={grid}>
            <div style={card}>
              <h2 style={h2}>Checklist</h2>
              <ul style={{ lineHeight: 1.8, marginTop: "8px" }}>
                <li>Confirm claim amount</li>
                <li>Pick proper venue (county)</li>
                <li>Draft facts summary</li>
                <li>List exhibits</li>
              </ul>
            </div>

            <div style={card}>
              <h2 style={h2}>Parties</h2>
              <div style={{ lineHeight: 1.8, marginTop: "8px" }}>
                Plaintiff: <strong>{MOCK_CASE.parties.plaintiff || "(not set)"}</strong>
                <br />
                Defendant: <strong>{MOCK_CASE.parties.defendant || "(not set)"}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

const card = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "14px 16px",
  marginTop: "12px",
  background: "#fff",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
  marginTop: "12px",
  maxWidth: "860px",
};

const h2 = { margin: 0, fontSize: "18px" };

const btnPrimary = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: 800,
  background: "#111",
  color: "#fff",
};

const btnSecondary = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: 800,
  border: "2px solid #111",
  color: "#111",
};


