// PATH: app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      {/* Hero */}
      <section className="border-b border-zinc-200">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-7">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Win your case.
              <br />
              Don’t lose because you were unprepared.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-700">
              THOXIE helps you prepare, organize, and draft faster — built for
              California family law. Not a law firm. No legal advice.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
              >
                Start now
              </Link>
              <Link
                href="/#compare"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Compare to attorney
              </Link>
            </div>

            <p className="mt-4 text-sm text-zinc-500">
              Built for self-represented people who want a real plan.
            </p>
          </div>

          <div className="md:col-span-5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">What THOXIE does</h2>
              <ul className="mt-4 space-y-3 text-sm text-zinc-700">
                <li>• Build a case plan (what to do next, in order)</li>
                <li>• Organize facts + evidence</li>
                <li>• Generate draft language + checklists</li>
                <li>• Prep for court dates and filings</li>
              </ul>

              <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                <div className="font-semibold text-zinc-900">Note</div>
                THOXIE is a preparation tool. It does not replace a lawyer and
                does not provide legal advice.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section id="compare" className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-bold tracking-tight">
            Compare to a traditional attorney workflow
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-700">
            Lawyers are expensive and time is limited. THOXIE helps you do the
            work you can do yourself: organize, draft, and prepare — so you
            don’t waste time or miss steps.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 p-6">
              <h3 className="text-lg font-semibold">With a lawyer</h3>
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                <li>• Slow back-and-forth</li>
                <li>• Expensive time for basic drafting</li>
                <li>• You still need to gather everything</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <h3 className="text-lg font-semibold">With THOXIE</h3>
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                <li>• Faster planning + drafting</li>
                <li>• Clear next-steps checklists</li>
                <li>• Evidence + timeline organization</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-bold tracking-tight">Pricing</h2>
          <p className="mt-4 max-w-3xl text-zinc-700">
            Prototype pricing placeholder. The goal is simple: reduce mistakes,
            reduce delays, and help you show up prepared.
          </p>

          <div className="mt-10 rounded-2xl border border-zinc-200 p-6">
            <div className="text-lg font-semibold">Starter</div>
            <div className="mt-2 text-3xl font-bold">$0</div>
            <p className="mt-2 text-sm text-zinc-700">
              Intake + basic guidance.
            </p>

            <div className="mt-6 text-lg font-semibold">Pro</div>
            <div className="mt-2 text-3xl font-bold">$—</div>
            <p className="mt-2 text-sm text-zinc-700">
              Drafting + evidence vault + preparation tools.
            </p>

            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
              >
                Get started
              </Link>
            </div>
          </div>

          <p className="mt-10 text-xs text-zinc-500">
            Not a law firm. No legal advice. Use at your own discretion.
          </p>
        </div>
      </section>
    </main>
  );
}

