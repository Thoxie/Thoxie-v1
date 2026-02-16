// Path: /app/resources/page.js
"use client";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";

const VIDEOS = [
  {
    id: "sc100-overview",
    title: "Small Claims Basics: What you file (SC-100) and what happens next",
    youtubeId: "dQw4w9WgXcQ", // TODO: replace with your real YouTube video ID
    bullets: [
      "What the SC-100 form is and when you use it.",
      "What you’ll need before you file (names, address, damages, story).",
      "What happens after you file (service + hearing timeline)."
    ]
  },
  {
    id: "service-methods",
    title: "Serving the defendant: personal vs substituted vs mail vs posting",
    youtubeId: "dQw4w9WgXcQ", // TODO: replace with your real YouTube video ID
    bullets: [
      "Which service methods exist and what they mean in plain English.",
      "What proof forms are commonly used (SC-104 / SC-104A / SC-112A).",
      "Common mistakes that cause delays."
    ]
  },
  {
    id: "evidence-exhibits",
    title: "Evidence & exhibits: how to organize receipts, photos, messages",
    youtubeId: "dQw4w9WgXcQ", // TODO: replace with your real YouTube video ID
    bullets: [
      "How to build a simple timeline and match each claim to proof.",
      "How many copies you usually need (court + defendant + you).",
      "How to label exhibits so the judge can follow quickly."
    ]
  }
];

function YouTubeEmbed({ youtubeId, title }) {
  const src = `https://www.youtube.com/embed/${youtubeId}`;
  return (
    <div style={{ width: "100%", maxWidth: 920 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "56.25%", // 16:9
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #e6e6e6",
          background: "#000"
        }}
      >
        <iframe
          title={title}
          src={src}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: 0
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Container style={{ flex: 1, fontFamily: "system-ui, sans-serif" }}>
        <PageTitle>Resources (California)</PageTitle>

        <TextBlock>
          Short instruction videos and simple checklists to help you finish your small claims filing.
          This is general information (not legal advice). Always confirm current rules on your court’s
          website.
        </TextBlock>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {VIDEOS.map((v) => (
            <section key={v.id} style={card}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>{v.title}</div>

              <YouTubeEmbed youtubeId={v.youtubeId} title={v.title} />

              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>What you’ll learn</div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                  {v.bullets.map((b) => (
                    <li key={b} style={{ marginBottom: 6 }}>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#666", lineHeight: 1.5 }}>
                Admin note: Replace the placeholder YouTube IDs with your real video IDs.
              </div>
            </section>
          ))}
        </div>
      </Container>

      <Footer />
    </main>
  );
}

const card = {
  border: "1px solid #e6e6e6",
  borderRadius: "12px",
  padding: "14px 16px",
  background: "#fff",
  maxWidth: "920px"
};

