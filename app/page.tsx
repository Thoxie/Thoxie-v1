import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950 pt-6">
      {/* Hero */}
      <section className="border-b border-zinc-200">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-10 md:grid-cols-12 md:py-14">
          <div className="md:col-span-7">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Win your case.
              <br />
              Don’t lose because you were unprepared.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-700 md:text-xl">
              THOXIE gives you speed, structure, and leverage — so you walk in knowing more,
              prepared faster, and in control.
            </p>

            <p className="mt-4 text-sm font-medium text-zinc-700">
              More knowledge in minutes. Less money burned. Better decisions.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Start Free
              </Link>
              <Link
                href="/#compare"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                See the difference
              </Link>
            </div>

            <div className="mt-4 text-xs text-zinc-600">
              California only · Secure · No credit card required
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 text-xs text-zinc-700 sm:grid-cols-4">
              {[
                "Built for California workflows",
                "Fast, structured case intake",
                "Strategy + next steps",
                "Stop losing to disorganization",
              ].map((t) => (
                <div key={t} className="rounded-xl border border-zinc-200 bg-white p-3">
                  {t}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <span className="font-semibold">Important:</span> THOXIE is not a law firm and does not provide legal advice.
              It is a legal support and preparation tool.
            </div>
          </div>

          {/* Preview card */}
          <div className="md:col-span-5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold">Your Advantage Dashboard</div>
              <div className="mt-1 text-xs text-zinc-600">Preview</div>

              <div className="mt-5 space-y-3">
                {[
                  ["Case Profile", "Start here"],
                  ["Winning Plan", "Build strategy"],
                  ["Deadlines", "Never miss one"],
                  ["Evidence", "Organized + tagged"],
                ].map(([a, b]) => (
                  <div
                    key={a}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 p-3"
                  >
                    <div className="text-xs font-medium text-zinc-800">{a}</div>
                    <div className="text-xs text-zinc-600">{b}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl bg-zinc-950 p-4 text-white">
                <div className="text-xs font-semibold">Start in minutes</div>
                <div className="mt-1 text-xs text-zinc-200">
                  Answer guided questions. Upload docs (optional). Get organized fast.
                </div>
                <Link
                  href="/signup"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-100"
                >
                  Create your case
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Win */}
      <section id="win" className="scroll-mt-44 mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">How to win your case with powered AI</h2>
        <p className="mt-3 max-w-3xl text-zinc-700">
          Most people don’t lose because they’re wrong. They lose because the other side is more prepared.
          THOXIE helps you show up ready — fast.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              title: "Step 1: Get organized fast",
              body: "Your facts, issues, dates, and priorities in one place — no chaos.",
            },
            {
              title: "Step 2: Build a winning plan",
              body: "Know what matters, what doesn’t, and what to do next to improve your odds.",
            },
            {
              title: "Step 3: Walk in with leverage",
              body: "More knowledge. More clarity. Better decisions — without paying an attorney to “figure it out.”",
            },
          ].map((x) => (
            <div key={x.title} className="rounded-2xl border border-zinc-200 p-6">
              <div className="text-sm font-semibold">{x.title}</div>
              <div className="mt-2 text-sm leading-relaxed text-zinc-700">{x.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Compare */}
      <section id="compare" className="scroll-mt-44 border-y border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            THOXIE vs traditional legal workflows
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="text-sm font-semibold">Traditional attorney workflow</div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                <li>• Step 1: Hire an attorney ($300–$1,000+ / hour)</li>
                <li>• Step 2: Pay a retainer ($5,000–$25,000+ upfront)</li>
                <li>• Step 3: Wait for callbacks, scheduling, updates</li>
                <li>• Step 4: Pay more for every question, revision, and email</li>
                <li>• Step 5: Hope you’re covered</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-white">
              <div className="text-sm font-semibold">THOXIE workflow</div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-200">
                <li>• Step 1: Start free (no retainer)</li>
                <li>• Step 2: Build your case in minutes</li>
                <li>• Step 3: Create a winning plan (clear next steps)</li>
                <li>• Step 4: Stay ahead (organized, always)</li>
                <li>• Step 5: Win with leverage (more knowledge, less cost)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Flow */}
      <section id="flow" className="scroll-mt-44 mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Go with the flow</h2>
        <p className="mt-3 max-w-3xl text-zinc-700">
          Simple visual comparison. One path is friction. The other is momentum.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="text-sm font-semibold text-zinc-900">Traditional attorney flow</div>
            <ol className="mt-6 space-y-4">
              {[
                { title: "Step 1: Hire an attorney", body: "$300–$1,000+ / hour" },
                { title: "Step 2: Pay a retainer", body: "$5,000–$25,000+ upfront" },
                { title: "Step 3: Wait", body: "Scheduling, callbacks, delays" },
                { title: "Step 4: Pay more", body: "Questions + revisions increase cost" },
                { title: "Step 5: Hope you’re ready", body: "You may still feel behind" },
              ].map((s, i) => (
                <li key={i} className="rounded-xl border border-zinc-200 p-4">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="mt-1 text-sm text-zinc-700">{s.body}</div>
                  {i !== 4 && <div className="mt-3 text-center text-zinc-400">↓</div>}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-white">
            <div className="text-sm font-semibold">THOXIE flow</div>
            <ol className="mt-6 space-y-4">
              {[
                { title: "Step 1: Start free", body: "No retainer. Test it first." },
                { title: "Step 2: Build your case fast", body: "Guided intake organizes everything." },
                { title: "Step 3: Get a winning plan", body: "Clear next steps — no guessing." },
                { title: "Step 4: Stay ahead", body: "Always-on organization." },
                { title: "Step 5: Win with leverage", body: "More knowledge, less cost." },
              ].map((s, i) => (
                <li key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="mt-1 text-sm text-zinc-200">{s.body}</div>
                  {i !== 4 && <div className="mt-3 text-center text-zinc-500">↓</div>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-44 border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Pricing</h2>
          <p className="mt-3 max-w-2xl text-zinc-700">
            Start free. Upgrade when you want more power, more outputs, and more advantage.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 p-6">
              <div className="text-sm font-semibold">Free</div>
              <div className="mt-2 text-3xl font-extrabold">$0</div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                <li>• Guided case setup</li>
                <li>• Basic issue spotting</li>
                <li>• Basic organization</li>
                <li>• Limited previews</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="text-sm font-semibold">Plus</div>
              <div className="mt-2 text-3xl font-extrabold">$29</div>
              <div className="text-xs text-zinc-600">per month</div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                <li>• Everything in Free</li>
                <li>• Strategy builder</li>
                <li>• Exports (PDF)</li>
                <li>• Deadline tracking</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-6">
              <div className="text-sm font-semibold">Pro</div>
              <div className="mt-2 text-3xl font-extrabold">$79</div>
              <div className="text-xs text-zinc-600">per month</div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                <li>• Everything in Plus</li>
                <li>• Multiple cases</li>
                <li>• Attorney-ready summaries</li>
                <li>• Advanced analysis & exports</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            THOXIE is not a law firm and does not provide legal advice. It’s a legal support and preparation tool.
          </div>
        </div>
      </section>
    </main>
  );
}

