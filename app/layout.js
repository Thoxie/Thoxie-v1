// Path: /app/layout.js
import "./globals.css";
import GlobalChatboxDock from "../src/components/GlobalChatboxDock";

export const metadata = {
  title: "Small Claims Genie",
  description: "AI Legal Decision Support"
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
