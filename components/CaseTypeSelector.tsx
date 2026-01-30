// PATH: components/CaseTypeSelector.tsx
"use client";

import { useRouter } from "next/navigation";

export default function CaseTypeSelector({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();

  return (
    <div
      className={
        compact
          ? "rounded-lg border border-zinc-200 bg-white px-3 py-2"
          : "mt-8 rounded-xl border border-neutral-200 p-6"
      }
    >
      {compact ? (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-zinc-900">Workflow</div>
          <button
            type="button"
            onClick={() => router.push("/case")}
            className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Family Law
          </button>
        </div>
      ) : (
        <>
          <div className="text-sm font-medium text-neutral-900">
            Select workflow
          </div>
          <p className="mt-2 text-sm text-neutral-700">
            Start a family law intake.
          </p>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => router.push("/case")}
              className="w-full rounded-lg border border-neutral-300 px-4 py-4 text-left text-sm hover:border-neutral-500"
            >
              <div className="text-base font-semibold text-neutral-900">
                Family Law
              </div>
              <div className="mt-1 text-sm text-neutral-700">
                Divorce, custody, support, property, and related matters.
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}


