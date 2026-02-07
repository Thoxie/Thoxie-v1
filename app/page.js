// path: /app/page.js
import Header from "./_components/Header";
import Footer from "./_components/Footer";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section style={{ padding: "28px 20px", flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: "28px" }}>
          California Small Claims (Mock-up)
        </h1>
        <p style={{ marginTop: "10px", maxWidth: "720px", fontSize: "16px" }}>
          Visual mock-up first. Next we’ll wire the intake flow, document preview,
          and a California-specific checklist.
        </p>
      </section>

      <Footer />
    </main>
  );
}

