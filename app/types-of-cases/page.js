// Path: /app/types-of-cases/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";

export default function TypesOfCasesPage() {
  const wrapStyle = {
    maxWidth: "1080px",
    margin: "0 auto",
    padding: "56px 20px 72px"
  };

  const h1Style = {
    fontSize: "clamp(40px, 6vw, 64px)",
    lineHeight: 1.05,
    margin: "0 0 18px 0",
    letterSpacing: "-0.02em"
  };

  const leadStyle = {
    fontSize: "18px",
    lineHeight: 1.65,
    color: "#3b3b3b",
    maxWidth: "860px",
    margin: "0 0 22px 0"
  };

  const h2Style = {
    fontSize: "24px",
    lineHeight: 1.25,
    margin: "26px 0 18px",
    letterSpacing: "-0.01em"
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "18px",
    marginTop: "10px"
  };

  const gridDesktopStyle = {
    gridTemplateColumns: "1fr 1fr",
    gap: "22px"
  };

  const cardStyle = {
    background: "#ffffff",
    border: "2px solid #e6e6e6", // 2× thicker as requested
    borderRadius: "22px",
    padding: "22px 22px 20px"
  };

  const cardH3Style = {
    fontSize: "30px",
    margin: "0 0 10px 0",
    letterSpacing: "-0.02em"
  };

  const cardPStyle = {
    margin: 0,
    fontSize: "16px",
    lineHeight: 1.65,
    color: "#3b3b3b"
  };

  const footerNoteStyle = {
    marginTop: "28px",
    borderTop: "1px solid #e6e6e6",
    paddingTop: "18px",
    color: "#3b3b3b",
    fontSize: "14px",
    lineHeight: 1.6,
    maxWidth: "900px"
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={wrapStyle}>
        <h1 style={h1Style}>Types of Small Claims</h1>

        <p style={leadStyle}>
          THOXIE helps you navigate small claims by identifying the right jurisdiction and venue,
          organizing your evidence, preparing court-ready documents, guiding service steps,
          and getting you ready for court.
        </p>

        <h2 style={h2Style}>Here are some of the most common types of disputes we help you prepare:</h2>

        {/* Desktop-first without global CSS changes: use a simple width check via CSS media query inline */}
        <div
          style={gridStyle}
          className="typesOfCasesGrid"
        >
          <article style={cardStyle}>
            <h3 style={cardH3Style}>Personal Loans &amp; IOUs</h3>
            <p style={cardPStyle}>
              Unpaid personal loans, shared expenses, or repayment promises that never happened.
              We help you organize texts, payment trails, and a timeline that shows the agreement,
              the amount, and the failure to repay.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={cardH3Style}>Online Purchases</h3>
            <p style={cardPStyle}>
              Non-delivery, counterfeit items, damaged goods, chargeback disputes, or refused refunds.
              We help you assemble order history, messages, tracking, photos, and the exact amount owed.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={cardH3Style}>Contractors / Home Services</h3>
            <p style={cardPStyle}>
              Incomplete work, poor workmanship, delays, or payment disputes with contractors.
              We help you document scope, change requests, milestones, invoices, and the cost
              to finish or fix the work.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={cardH3Style}>Landlord / Tenant</h3>
            <p style={cardPStyle}>
              Security deposit disputes, unlawful deductions, habitability issues, rent-related disputes,
              or repair reimbursement. We help you structure move-in/move-out evidence, repair quotes,
              written notices, and a damages breakdown that’s easy for a judge to follow.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={cardH3Style}>Injury (Out-of-Pocket Costs)</h3>
            <p style={cardPStyle}>
              Recover medical bills, treatment costs, replacement costs, and other out-of-pocket expenses
              from minor incidents. We help you package receipts, medical documentation, and a simple
              causation narrative that stays focused and credible.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={cardH3Style}>Auto Repair</h3>
            <p style={cardPStyle}>
              Disputes over bad repairs, overcharging, unauthorized work, “fixed” problems that return,
              or vehicles returned worse than before. We help you collect invoices, estimates, photos,
              and any expert notes to support a refund or repair-cost claim.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={cardH3Style}>Airlines</h3>
            <p style={cardPStyle}>
              Sue for lost baggage, delays, denied boarding, damaged items, or out-of-pocket expenses.
              We help you document what happened, what you spent, what you requested from the airline,
              and how to present it clearly in court.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={cardH3Style}>Airbnb</h3>
            <p style={cardPStyle}>
              File Airbnb-related claims for cancellations, unsafe conditions, property damage,
              withheld deposits, or misrepresentation. We help you organize messages, photos,
              receipts, and a clean timeline so your damages are easy to prove.
            </p>
          </article>
        </div>

        {/* Inline, page-local media behavior without touching global CSS */}
        <style>{`
          @media (min-width: 860px) {
            .typesOfCasesGrid {
              display: grid !important;
              grid-template-columns: ${gridDesktopStyle.gridTemplateColumns} !important;
              gap: ${gridDesktopStyle.gap} !important;
            }
          }
        `}</style>

        <div style={footerNoteStyle}>
          Not sure which one you have? Describe what happened in plain English. THOXIE will classify the dispute,
          flag missing proof, and tell you the next step.
        </div>
      </Container>

      <Footer />
    </main>
  );
}
