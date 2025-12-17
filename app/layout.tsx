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
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
            {/* LOGO ONLY */}
            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src="/thoxie-logo.png.png"
                alt="THOXIE"
                width={600}
                height={200}
                priority
                className="h-28 w-auto max-h-none"
              />
            </Link>

            {/* NAV: balanced spacing, no crowding */}
            <nav className="hidden flex-1 items-center justify-center md:flex">
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-700">
                <Link href="/#win" className="whitespace-nowrap hover:text-zinc-950">
                  Win your case
                </Link>
                <Link href="/#compare" className="whitespace-nowrap hover:text-zinc-950">
                  Compare to Attorney
                </Link>
                <Link href="/#flow" className="whitespace-nowrap hover:text-zinc-950">
                  How it works
                </Link>
                <Link href="/#pricing" className="whitespace-nowrap hover:text-zinc-950">
                  Pricing
                </Link>
                <Link href="/about-us" className="whitespace-nowrap hover:text-zinc-950">
                  About
                </Link>
                <Link href="/contact" className="whitespace-nowrap hover:text-zinc-950">
                  Contact
                </Link>
              </div>
            </nav>

            {/* ACTIONS */}
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 lg:inline-block"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Start Free
              </Link>
            </div>
          </div>

          {/* MOBILE NAV */}
          <div className="border-t border-zinc-200 bg-white/80 md:hidden">
            <div className="mx-auto max-w-6xl px-6 py-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-700">
                <Link href="/#win" className="hover:text-zinc-950">Win</Link>
                <Link href="/#compare" className="hover:text-zinc-950">Compare</Link>
                <Link href="/#flow" className="hover:text-zinc-950">How it works</Link>
                <Link href="/#pricing" className="hover:text-zinc-950">Pricing</Link>
                <Link href="/about-us" className="hover:text-zinc-950">About</Link>
                <Link href="/contact" className="hover:text-zinc-950">Contact</Link>
                <Link href="/login" className="hover:text-zinc-950">Log in</Link>
              </div>
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


