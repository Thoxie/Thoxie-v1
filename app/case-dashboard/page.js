// path: /app/case-dashboard/page.js
import Header from "../_components/Header";

export default function CaseDashboardPage() {
  return (
    <main>
      <Header />

      <section style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ marginTop: 0 }}>Case Dashboard (Mock-up)</h1>

        <div style={{ maxWidth: "820px" }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 800 }}>California Small Claims</div>
                <div style={{ color: "#444", marginTop: "4px" }}>
                  Status: Draft • County: (not set)
                </div>
              </div>
              <a href="/start" style={btnPrimary}>
                Continue Intake
              </a>
            </div>
          </div>

          <div style={grid}>
            <div style={card}>
              <h2 style={h2}>Checklist</h2>
              <ul style={{ lineHeight: 1.8, marginTop: "8px" }}>
                <li>Confirm claim amount</li>
                <li>Pick proper venue (county)</li>
                <li>Draft facts summary</li>
                <li>Attach exhibits</li>
              </ul>
            </div>

            <div style={card}>
              <h2 style={h2}>Draft Packet</h2>
              <p style={{ marginTop: "8px" }}>
                Placeholder for document preview/download.
              </p>
              <a href="/document-preview" style={btnSecondary}>
                Open Preview
              </a>
            </div>
          </div>

          <div style={{ marginTop: "18px" }}>
            <a href="/" style={btnSecondary}>
              Home
            </a>
          </div>
        </div>
      </section>
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
  marginTop: "10px",
};


