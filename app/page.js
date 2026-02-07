// path: /app/page.js
import Header from "./_components/Header";
import Footer from "./_components/Footer";
import StateBadge from "./_components/StateBadge";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section style={{ padding: "28px 20px", flex: 1 }}>
        <StateBadge />

        <h1 style={{ margin: "12px 0 0 0", fontSize: "28px" }}>
          Small Claims Assistant
        </h1>

        <p style={{ marginTop: "10px", maxWidth: "720px", fontSize: "16px" }}>
          A guided, California-only mock-up for preparing small claims cases.
        </p>
      </section>

      <Footer />
    </main>
  );
}


