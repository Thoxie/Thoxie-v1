import Link from 'next/link'

export default function Home() {
  return (
    <div className="home-container">
      <header className="hero">
        <h1>Welcome to Thoxie</h1>
        <p className="subtitle">Your Small Claims Court Assistant</p>
        <p className="description">Simplifying the small claims court process with an intuitive interface and AI-powered guidance.</p>
      </header>

      <section className="features">
        <h2>Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>📋 Intake Wizard</h3>
            <p>Step-by-step guidance to file your small claims case</p>
            <Link href="/intake-wizard" className="btn">Get Started</Link>
          </div>

          <div className="feature-card">
            <h3>📊 Case Dashboard</h3>
            <p>Track and manage all your cases in one place</p>
            <Link href="/case-dashboard" className="btn">View Cases</Link>
          </div>

          <div className="feature-card">
            <h3>📄 Documents</h3>
            <p>Preview and manage your court documents</p>
            <Link href="/document-preview" className="btn">Browse Documents</Link>
          </div>

          <div className="feature-card">
            <h3>🤖 AI Assistant</h3>
            <p>Get instant help from our AI-powered legal assistant</p>
            <Link href="/ai-chatbox" className="btn">Chat Now</Link>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <p>&copy; 2026 Thoxie. Making small claims court accessible to everyone.</p>
      </footer>
    </div>
  )
}

