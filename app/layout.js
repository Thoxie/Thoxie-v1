// path: /app/layout.js
export const metadata = {
  title: "Thoxie – California Small Claims",
  description: "California Small Claims mock-up (v1)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
