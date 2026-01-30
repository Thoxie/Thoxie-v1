// PATH: app/page.tsx

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      {/* Hero */}
      <section className="border-b border-zinc-200">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-7">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Legal decision support, structured.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-700">
              THOXIE helps organize facts, documents, and draft-ready structure for
              family law workflows.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/case"
                className="inline-flex items-center justify-center rounded-md bg-zinc-950 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Start Family Law
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Create account
              </Link>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="text-sm font-semibold text-zinc-900">
                Family Law baseline
              </div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                <li>Structured intake</li>
                <li>Neutral drafting support</li>
                <li>Document organization</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8">
          <div className="text-lg font-semibold">Continue</div>
          <p className="mt-2 text-sm text-zinc-700">
            Go to the Family Law entry point to begin.
          </p>
          <div className="mt-6">
            <Link
              href="/case"
              className="inline-flex items-center justify-center rounded-md bg-zinc-950 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Open Family Law
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

