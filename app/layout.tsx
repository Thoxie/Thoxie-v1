// Path: /app/layout.tsx
import "./globals.css";
import GlobalChatboxDock from "../src/components/GlobalChatboxDock";

export const metadata = {
  title: "THOXIE",
  description: "AI Legal Decision Support"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <GlobalChatboxDock />
      </body>
    </html>
  );
}

