// Path: /app/layout.js
import "./globals.css";
import GlobalChatboxDock from "../src/components/GlobalChatboxDock";

export const metadata = {
  title: "THOXIE",
  description: "California Small Claims pro-se assistant"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <GlobalChatboxDock />
      </body>
    </html>
  );
}
