// Path: /app/how-it-works/HowItWorksStatic.js
import { ROUTES } from "../_config/routes";

export default function HowItWorksStatic() {
  const styles = {
    heroWrap: {
      textAlign: "center",
      paddingBottom: "14px",
    },
    h1: {
      fontSize: "37px",
      fontWeight: 800,
      lineHeight: 1.0,
      margin: "14px 0 10px",
    },
    h1Secondary: {
      display: "block",
      fontSize: "32px",
      fontWeight: 800,
    },
    heroP: {
      maxWidth: "760px",
      margin: "0 auto",
      fontSize: "18px",
      opacity: 0.86,
    },
    ctaBtn: {
      textDecoration: "none",
      padding: "12px 18px",
      borderRadius: "12px",
      fontWeight: 700,
      border: "1px solid #111",
      margin: "8px",
      display: "inline-block",
      color: "#111",
      background: "transparent",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "14px",
      padding: "9px 0 50px",
      textAlign: "left",
    },
    card: {
      border: "1px solid #eee",
      borderRadius: "14px",
      padding: "12px 14px",
      background: "#fafafa",
    },
    cardTitle: {
      margin: "6px 0 6px",
      fontSize: "17px",
      fontWeight: 800,
    },
    ul: {
      margin: 0,
      paddingLeft: "18px",
    },
    li: {
      margin: "4px 0",
      fontSize: "14px",
      opacity: 0.95,
    },
    bottomCta: {
      borderTop: "1px solid #eee",
      background: "#fafafa",
      textAlign: "center",
      padding: "16px 20px 40px",
      marginTop: "10px",
    },
    bottomCtaH2: {
      fontSize: "28px",
      fontWeight: 900,
      margin: "0 0 6px",
      lineHeight: 0.8, // tightened ~50%
    },
    bottomCtaP: {
      margin: 0,
      lineHeight: 0.8, // tightened ~50%
    },
  };

  return (
    <div>
      {/* HERO */}
      <section style={styles.heroWrap}>
        <h1 style={styles.h1}>
          Lawyers aren’t allowed in Small Claims Court.
          <span style={styles.h1Secondary}>Use the AI advantage of THOXIE.</span>
        </h1>

        <p style={styles.heroP}>
          Don’t retain a lawyer for advice when you can use THOXIE — an AI-powered system built
          to guide your case from start to hearing.
        </p>

        <div>
          <a href={ROUTES.start} style={styles.ctaBtn}>
            Start Preparing Your Case
          </a>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Why THOXIE Exists</div>
          <ul style={styles.ul}>
            <li style={styles.li}>Lawyers are not allowed in Small Claims Court</li>
            <li style={styles.li}>AI-powered full-service legal guidance</li>
            <li style={styles.li}>No need to retain a lawyer for advice</li>
          </ul>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>AI-Guided Case Preparation</div>
          <ul style={styles.ul}>
            <li style={styles.li}>Instantly identifies what matters</li>
            <li style={styles.li}>Know what to do next</li>
            <li style={styles.li}>No legal jargon or guessing</li>
          </ul>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Avoid Costly Mistakes</div>
          <ul style={styles.ul}>
            <li style={styles.li}>Court-specific document builder</li>
            <li style={styles.li}>Organized, credible paperwork</li>
            <li style={styles.li}>Avoid rejections and delays</li>
          </ul>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Evidence Organization</div>
          <ul style={styles.ul}>
            <li style={styles.li}>Turns emails, texts, and receipts into a timeline</li>
            <li style={styles.li}>Builds a clear narrative</li>
            <li style={styles.li}>Presents a clean case judges can follow</li>
          </ul>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Step-by-Step Roadmap</div>
          <ul style={styles.ul}>
            <li style={styles.li}>Know what to do and when</li>
            <li style={styles.li}>Prevent missed deadlines</li>
            <li style={styles.li}>Stay organized from start to hearing</li>
          </ul>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Fast, Clear Answers</div>
          <ul style={styles.ul}>
            <li style={styles.li}>Understand options and risks</li>
            <li style={styles.li}>No hourly legal fees</li>
            <li style={styles.li}>Make confident decisions quickly</li>
          </ul>
        </div>
      </section>

      {/* BOTTOM CTA (page-local; safe) */}
      <section style={styles.bottomCta}>
        <div style={styles.bottomCtaH2}>Don’t retain a lawyer for advice when you can use THOXIE.</div>
        <div style={styles.bottomCtaP}>Prepare smarter. File correctly. Present confidently.</div>
      </section>
    </div>
  );
}
