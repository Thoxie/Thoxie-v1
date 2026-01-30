// app/layout.tsx

import './globals.css'

export const metadata = {
  title: 'Thoxie',
  description: 'A platform for legal assistance with chat-driven interaction',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


