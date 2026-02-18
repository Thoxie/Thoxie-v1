// Path: /app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import GlobalChatboxDock from "../src/components/GlobalChatboxDock";

export const metadata: Metadata = {
  title: "Small Claims Court App",
  description: "Guided legal assistance for self-represented users"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <main>{children}</main>
        <GlobalChatboxDock />
      </body>
    </html>
  );
}
