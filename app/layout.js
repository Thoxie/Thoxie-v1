// PATH: app/layout.js
// FILE: layout.js
// ACTION: FULL OVERWRITE

import "./globals.css";
import GlobalChatboxDock from "../src/components/GlobalChatboxDock";

export const metadata = {
  title: "THOXIE",
  description: "AI Legal Decision Support",
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
