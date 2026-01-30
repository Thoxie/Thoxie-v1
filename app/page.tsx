// app/page.tsx

"use client";

import Link from "next/link";
import CaseTypeSelector from "../components/CaseTypeSelector";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
              THOXIE
            </h1>
            <p className="mt-3 max-w-2xl text-neutral-700">
              Legal decision support and preparation. Select a workflow to begin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Sign up
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-10">
          <CaseTypeSelector />
        </div>

        <div className="mt-10 rounded-xl border border-neutral-200 p-6">
          <div className="text-sm font-medium text-neutral-900">Entry points</div>
          <ul className="mt-3 list-disc pl-5 text-sm text-neutral-700">
            <li>
              Family Law: <code className="text-neutral-900">/case</code>
            </li>
            <li>
              DVRO: <code className="text-neutral-900">/dvro</code>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}


