// path: /app/page.js
import Header from "./_components/Header";

export default function HomePage() {
  return (
    <main>
      <Header />

      <section style={{ padding: "28px 20px" }}>
        <h1 style={{ margin: 0, fontSize: "28px" }}>
          California Small Claims (Mock-up)
        </h1>
        <p style={{ marginTop: "10px", maxWidth: "720px", fontSize: "16px" }}>
          Visual mock-up first. Next we’ll wire the intake flow, document preview,
          and a California-specific checklist.
        </p>
      </section>
    </main>
  );
}

