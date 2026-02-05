import NavLayout from '../src/components/NavLayout.js'
import './globals.css'

export const metadata = {
  title: 'Thoxie - Small Claims Court',
  description: 'Small Claims Court Application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavLayout>
          {children}
        </NavLayout>
      </body>
    </html>
  )
}
