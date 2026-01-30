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
      className={[
        compact ? "rounded-lg border border-zinc-200 bg-white px-3 py-2" : "mt-8 rounded-xl border border-neutral-200 p-6",
      ].join(" ")}
    >
      {!compact ? (
        <>
          <div className="text-sm font-medium text-neutral-900">Select workflow</div>
          <p className="mt-2 text-sm text-neutral-700">Start a family law intake.</p>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-zinc-900">Workflow</div>
          <div className="text-sm text-zinc-700">Family Law</div>
        </div>
      )}

      <div className={compact ? "mt-2" : "mt-4"}>
        <button
          type="button"
          onClick={() => router.push("/case")}
          className={[
            "w-full rounded-lg border px-4 py-3 text-left text-sm hover:border-neutral-500",
            compact ? "border-zinc-300" : "border-neutral-300",
          ].join(" ")}
        >
          <div className="text-base font-semibold text-neutral-900">Family Law</div>
          {!compact ? (
            <div className="mt-1 text-sm text-neutral-700">
              Divorce, custody, support, property, and related matters.
            </div>
          ) : null}
        </button>
      </div>
    </div>
  );
}


