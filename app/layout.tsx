import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Small Claims Court Application',
  description: 'A unified platform for small claims court case management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          {/* Navigation Header */}
          <nav className="bg-blue-900 text-white shadow-lg">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold">Small Claims Court</h1>
                </div>
                <div className="flex space-x-4">
                  <Link href="/" className="px-3 py-2 rounded-md hover:bg-blue-800 transition">
                    Home
                  </Link>
                  <Link href="/intake" className="px-3 py-2 rounded-md hover:bg-blue-800 transition">
                    Intake Wizard
                  </Link>
                  <Link href="/dashboard" className="px-3 py-2 rounded-md hover:bg-blue-800 transition">
                    Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-gray-800 text-white py-4 mt-8">
            <div className="container mx-auto px-4 text-center">
              <p>&copy; 2026 Small Claims Court Application. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
