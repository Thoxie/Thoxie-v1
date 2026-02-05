import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Case Management System - Mockup",
  description: "Small Claims Court Case Management Mockup with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
