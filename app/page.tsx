// app/page.tsx

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CaseType = "family_law" | "dvro";

const CASE_TYPES: { id: CaseType; title: string; description: string }[] = [
  {
    id: "family_law",
    title: "Family Law",
    description:
      "Divorce, custody, support, property, and related family-law matters.",
  },
  {
    id: "dvro",
    title: "DVRO",
    description:
      "Domestic Violence Restraining Order workflow and preparation tools.",
  },
];

export default function HomePage() {
  const [selected, setSelected] = useState<CaseType>("family_law");

  const startHref = useMemo(() => {
    return selected === "dvro" ? "/dvro" : "/case";
  }, [selected]);

  useEffect(() => {
    // Reserved for future: persist selection (e.g., localStorage).
  }, []);

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold tracking-wide text-neutral-700">
                THOXIE
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Choose your matter type
              </h1>
              <p className="mt-2 max-w-2xl text-neutral-700">
                Select a workflow. THOXIE will guide intake, organize facts and
                documents, and generate structured drafts.
              </p>
            </div>

            <div className="text-sm text-neutral-600">
              <Link
                href="/signup"
                className="rounded-md border border-neutral-300 px-3 py-2 hover:bg-neutral-50"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {CASE_TYPES.map((ct) => {
            const active = ct.id === selected;
            return (
              <button
                key={ct.id}
                type="button"
                onClick={() => setSelected(ct.id)}
                className={[
                  "rounded-xl border p-6 text-left transition",
                  active
                    ? "border-neutral-900"
                    : "border-neutral-200 hover:border-neutral-400",
                ].join(" ")}
              >
                <div className="text-lg font-semibold">{ct.title}</div>
                <div className="mt-2 text-sm text-neutral-700">
                  {ct.description}
                </div>
                <div className="mt-4 text-xs text-neutral-500">
                  {active ? "Selected" : "Select"}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Link
            href={startHref}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Start
          </Link>

          <Link
            href="/case"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
          >
            Go to Family Law
          </Link>
        </div>

        <div className="mt-10 rounded-xl border border-neutral-200 p-6">
          <div className="text-sm font-semibold">Notes</div>
          <ul className="mt-3 list-disc pl-5 text-sm text-neutral-700">
            <li>
              This restore target keeps a simple case-type selector on the home
              page.
            </li>
            <li>
              DVRO and Family Law remain separate entry points to avoid
              cross-contamination of workflows.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}

