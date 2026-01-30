// PATH: app/case/page.tsx
"use client";

import Link from "next/link";

export default function CasePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Family Law
            </h1>
            <p className="mt-2 text-sm text-neutral-700">
              Family law intake and preparation will be built here.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Home
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-neutral-200 p-6 text-sm text-neutral-700">
          This is the restored baseline. No DVRO. No advanced intake yet.
        </div>
      </div>
    </main>
  );
}




