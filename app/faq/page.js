// Path: /app/faq/page.js
import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";

export default function FaqPage() {
  const pageWrapStyle = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column"
  };

  const contentWrapStyle = {
    maxWidth: "1080px",
    margin: "0 auto",
    padding: "18px 20px 72px"
  };

  const h1Style = {
    fontSize: "clamp(20px, 3vw, 32px)",
    lineHeight: 1.1,
    margin: "0 0 14px 0",
    letterSpacing: "-0.02em",
    fontWeight: 900
  };

  const leadStyle = {
    fontSize: "18px",
    lineHeight: 1.65,
    color: "#3b3b3b",
    maxWidth: "900px",
    margin: "0 0 22px 0"
  };

  const faqListStyle = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
    marginTop: "10px"
  };

  const cardStyle = {
    background: "#ffffff",
    border: "2px solid #e6e6e6",
    borderRadius: "22px",
    padding: "19px 19px 17px"
  };

  const qStyle = {
    fontSize: "22px",
    lineHeight: 1.25,
    margin: "0 0 10px 0",
    letterSpacing: "-0.01em",
    fontWeight: 900
  };

  const aStyle = {
    margin: 0,
    fontSize: "16px",
    lineHeight: 1.65,
    color: "#3b3b3b"
  };

  return (
    <main style={pageWrapStyle}>
      <Header />

      <Container style={contentWrapStyle}>
        <h1 style={h1Style}>Frequently Asked Questions</h1>

        <p style={leadStyle}>
          Clear answers to common questions about how THOXIE helps you prepare a small claims case. If you don’t see your
          question here, describe what happened in plain English and THOXIE will guide you.
        </p>

        <section style={faqListStyle} aria-label="FAQ">
          <article style={cardStyle}>
            <h3 style={qStyle}>How does THOXIE help people file small claims cases?</h3>
            <p style={aStyle}>
              THOXIE turns the small-claims process into a guided workflow. You answer structured questions, and THOXIE
              organizes the facts, calculates what’s needed, and prepares court-ready documents so you’re not hunting for
              the right forms, rules, and steps on your own.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>Do I need a lawyer to use THOXIE?</h3>
            <p style={aStyle}>
              No. Small claims court is designed so people can represent themselves. THOXIE is built to guide you through
              the process without needing to hire an attorney, while helping you prepare a clean, organized presentation
              for court.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>Can THOXIE help me understand whether I have a strong case?</h3>
            <p style={aStyle}>
              THOXIE can help analyze the facts you provide and highlight missing information or evidence that may
              strengthen your claim. While it cannot guarantee an outcome, it helps you organize the case so the key
              points are clear and supported.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>What evidence should I collect before filing?</h3>
            <p style={aStyle}>
              Strong cases rely on clear documentation. Useful evidence may include receipts, contracts, text messages,
              emails, photos, repair estimates, invoices, and payment records. THOXIE helps you organize these materials
              into a clear timeline so a judge can quickly understand what happened.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>How much does it cost to file a case?</h3>
            <p style={aStyle}>
              Filing fees vary by court and by claim amount, and service costs vary depending on location and difficulty.
              THOXIE’s platform fee is separate from court fees and service costs, which are set by the local
              jurisdiction. In general: THOXIE fee + court filing fee + service cost.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>Can I recover court fees if I win?</h3>
            <p style={aStyle}>
              In many small claims courts, filing fees and certain service costs can be added to your claim and may be
              awarded if you win. THOXIE helps you track these costs so they can be included properly when preparing
              your claim.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>What is the maximum amount I can sue for?</h3>
            <p style={aStyle}>
              Small-claims limits are set by each state (and sometimes by court type). THOXIE helps you stay within the
              limit for the court you’re filing in, and if your damages exceed the limit, it can prompt you to choose a
              strategy (reduce the amount, or consider a different court option).
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>What is the statute of limitations?</h3>
            <p style={aStyle}>
              The statute of limitations is the deadline to file. Miss it, and the court may dismiss the case even if
              your facts are strong. The time limit depends on the claim type (contract, property damage, personal
              injury, etc.). THOXIE helps you identify deadlines by asking what happened and when it happened.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>How do I know the correct court to file in?</h3>
            <p style={aStyle}>
              Court selection depends on jurisdiction and venue—usually tied to where the defendant is located and where
              the dispute happened. THOXIE helps you identify the correct court by collecting those key facts and using
              them to direct the filing to the proper place.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>Can I file a case against a business using THOXIE?</h3>
            <p style={aStyle}>
              Yes. Small claims courts commonly allow cases against businesses (contractors, landlords, retailers, and
              service providers). THOXIE helps you capture the business details, what happened, and what you’re asking
              for—then package it into a clean, court-ready presentation.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>What is a demand letter, and why does it matter?</h3>
            <p style={aStyle}>
              A demand letter is a written request to resolve the issue before filing a lawsuit. It explains what
              happened, what you want, and gives a clear deadline to pay or fix the problem. Many disputes settle at
              this step. THOXIE can help generate a professional demand letter that’s structured, clear, and easy to
              support with receipts, messages, and timelines.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>Does THOXIE handle service of process?</h3>
            <p style={aStyle}>
              Every small-claims case requires formal notice to the defendant (service of process). THOXIE guides you
              through service requirements and can support arranging professional service so the delivery is handled
              correctly and documented, which is often required before the court will proceed.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>Can I settle the case before the hearing?</h3>
            <p style={aStyle}>
              Yes. Many disputes are resolved before the court date through negotiation or settlement. If both sides
              agree to a payment or resolution, the case can often be closed without appearing in court. THOXIE helps
              you prepare your case so you’re in a stronger position to negotiate.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>What should I expect during the court hearing?</h3>
            <p style={aStyle}>
              Small claims hearings are usually brief and informal. Each side presents their explanation and evidence to
              the judge. The judge may ask questions and then decide either immediately or shortly after the hearing.
              THOXIE helps you organize your presentation so the facts are clear and easy to follow.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>How long does a small claims case usually take?</h3>
            <p style={aStyle}>
              The timeline depends on the court and how quickly the defendant is served. After filing, courts typically
              schedule hearings several weeks to a few months later. THOXIE helps you prepare everything in advance so
              you’re ready once the court sets the hearing date.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>What if the defendant files a counterclaim?</h3>
            <p style={aStyle}>
              Sometimes the other party may file a claim against you related to the same dispute. If that happens, the
              court will usually hear both claims at the same hearing. THOXIE helps you organize your response so you
              can address the counterclaim clearly.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>What happens after I win a case?</h3>
            <p style={aStyle}>
              Winning a judgment means the court agrees the defendant owes you money. If the defendant pays voluntarily,
              the case is resolved. If they do not pay, additional steps may be required to collect the judgment. THOXIE
              can help explain the common options available for enforcing a judgment.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>What happens if the defendant cannot be found?</h3>
            <p style={aStyle}>
              Process servers typically attempt service multiple times. If they can’t complete service, you may need a
              better address, a different service location, or additional steps to locate the defendant. THOXIE helps
              you understand the next best option so the case doesn’t stall.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>What if I lose the case?</h3>
            <p style={aStyle}>
              If the court decides against your claim, the case usually ends at that point. In some situations there may
              be options to appeal or take other legal steps depending on local rules. THOXIE helps you prepare a clear,
              well-supported case from the start to improve your chances.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>Is my information secure when using THOXIE?</h3>
            <p style={aStyle}>
              THOXIE is designed to handle sensitive information responsibly. The platform stores case details securely
              and uses them only to help prepare your claim and related documents.
            </p>
          </article>

          <article style={cardStyle}>
            <h3 style={qStyle}>Why use THOXIE instead of filing on your own?</h3>
            <p style={aStyle}>
              You can file on your own, but it often requires finding the correct forms, understanding court rules,
              organizing evidence, and completing service properly. THOXIE streamlines this into a guided system so you
              can focus on what happened and what you can prove, while the platform structures it into court-ready
              outputs.
            </p>
          </article>
        </section>
      </Container>

      <Footer />
    </main>
  );
}
