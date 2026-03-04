// Path: /app/types-of-cases/page.js

export default function TypesOfCasesPage() {

  const cardStyle = {
    border: "2px solid #e6e6e6",
    borderRadius: "22px",
    padding: "22px",
    background: "#ffffff"
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "22px",
    marginTop: "10px"
  };

  const wrapStyle = {
    maxWidth: "1080px",
    margin: "0 auto",
    padding: "56px 20px 72px"
  };

  const leadStyle = {
    fontSize: "18px",
    lineHeight: "1.65",
    color: "#3b3b3b",
    maxWidth: "860px"
  };

  const footerNote = {
    marginTop: "28px",
    borderTop: "1px solid #e6e6e6",
    paddingTop: "18px",
    color: "#3b3b3b",
    fontSize: "14px",
    lineHeight: "1.6",
    maxWidth: "900px"
  };

  return (
    <main style={wrapStyle}>

      <h1 style={{
        fontSize: "64px",
        lineHeight: "1.05",
        marginBottom: "18px",
        letterSpacing: "-0.02em"
      }}>
        Types of Small Claims
      </h1>

      <p style={leadStyle}>
        THOXIE helps you navigate small claims by identifying the right jurisdiction and venue,
        organizing your evidence, preparing court-ready documents, guiding service steps,
        and getting you ready for court.
      </p>

      <h2 style={{marginTop:"26px"}}>
        Here are some of the most common types of disputes we help you prepare:
      </h2>

      <section style={gridStyle}>

        <div style={cardStyle}>
          <h3>Personal Loans & IOUs</h3>
          <p>
            Unpaid personal loans, shared expenses, or repayment promises that never happened.
            We help you organize texts, payment trails, and a timeline that shows the agreement,
            the amount, and the failure to repay.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>Online Purchases</h3>
          <p>
            Non-delivery, counterfeit items, damaged goods, chargeback disputes, or refused refunds.
            We help you assemble order history, messages, tracking, photos, and the exact amount owed.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>Contractors / Home Services</h3>
          <p>
            Incomplete work, poor workmanship, delays, or payment disputes with contractors.
            We help you document scope, change requests, milestones, invoices, and the cost
            to finish or fix the work.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>Landlord / Tenant</h3>
          <p>
            Security deposit disputes, unlawful deductions, habitability issues, rent-related disputes,
            or repair reimbursement.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>Injury (Out-of-Pocket Costs)</h3>
          <p>
            Recover medical bills, treatment costs, replacement costs, and other out-of-pocket expenses
            from minor incidents.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>Auto Repair</h3>
          <p>
            Disputes over bad repairs, overcharging, unauthorized work, or vehicles returned worse than before.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>Airlines</h3>
          <p>
            Lost baggage, delays, denied boarding, damaged items, or reimbursement for travel disruptions.
          </p>
        </div>

        <div style={cardStyle}>
          <h3>Airbnb</h3>
          <p>
            Claims involving cancellations, unsafe conditions, property damage,
            withheld deposits, or misrepresentation.
          </p>
        </div>

      </section>

      <div style={footerNote}>
        Not sure which one you have? Describe what happened in plain English.
        THOXIE will classify the dispute, flag missing proof, and tell you the next step.
      </div>

    </main>
  );
}
