import Link from 'next/link';
import '../styles/nav.css';

export default function NavLayout({ children }) {
    return (
        <div className="nav-container">
            <nav className="navbar">
                <div className="nav-brand">
                    <Link href="/">
                        <span className="logo">Thoxie</span>
                    </Link>
                </div>
                <ul className="nav-menu">
                    <li><Link href="/">Home</Link></li>
                    <li><Link href="/intake-wizard">Intake Wizard</Link></li>
                    <li><Link href="/case-dashboard">Case Dashboard</Link></li>
                    <li><Link href="/document-preview">Documents</Link></li>
                    <li><Link href="/ai-chatbox">AI Assistant</Link></li>
                </ul>
            </nav>
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
