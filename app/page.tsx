import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      {/* Hero */}
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="text-4xl font-bold tracking-tight">
            THOXIE — Family-law decision support
          </h1>
          <p className="mt-4 max-w-2xl text-zinc-700">
            Organize facts, understand options, prep drafts, and build a clean record.
            Not a law firm.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/case"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800"
            >
              Start a Case
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-zinc-300 px-4 py-2 hover:bg-zinc-50"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="mx-auto max-w-6xl px-4 py-12 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 p-6">
          <h2 className="font-semibold">Explain Your Side</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Timeline + key facts + exhibits, organized for declarations.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 p-6">
          <h2 className="font-semibold">Prepare for Hearings</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Checklist style prep so you don’t miss deadlines or documents.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 p-6">
          <h2 className="font-semibold">Draft Outputs</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Clean, neutral drafts you can edit and file.
          </p>
        </div>
      </section>
    </main>
  );
}

