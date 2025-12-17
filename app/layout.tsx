import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "THOXIE — Win your case",
  description:
    "THOXIE is a legal support and preparation tool built for California. Not a law firm. No legal advice.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-white text-zinc-950">
        <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/thoxie-logo.png.png"
                alt="THOXIE"
                width={120}
                height={40}
                priority
              />
              <span className="text-sm font-semibold tracking-wide">THOXIE</span>
              <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                California
              </span>
            </Link>

            <nav className="hidden items-center gap-6 text-sm text-zinc-700 md:flex">
              <Link href="/#win" className="hover:text-zinc-950">Win your case</Link>
              <Link href="/#compare" className="hover:text-zinc-950">THOXIE vs Attorney</Link>
              <Link href="/#flow" className="hover:text-zinc-950">Go with the flow</Link>
              <Link href="/#pricing" className="hover:text-zinc-950">Pricing</Link>
              <Link href="/about-us" className="hover:text-zinc-950">About</Link>
              <Link href="/contact" className="hover:text-zinc-950">Contact</Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 md:inline-block"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Start Free
              </Link>
            </div>
          </div>
        </header>

        {children}

        <footer className="border-t border-zinc-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-10 text-xs text-zinc-600">
            © 2025 THOXIE · Not a law firm · No legal advice · Legal support and preparation tool
          </div>
        </footer>
      </body>
    </html>
  );
}


