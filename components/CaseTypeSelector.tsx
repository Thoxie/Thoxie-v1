// PATH: components/CaseTypeSelector.tsx
"use client";

import { useRouter } from "next/navigation";

export default function CaseTypeSelector() {
  const router = useRouter();

  return (
    <div className="mt-8 rounded-xl border border-neutral-200 p-6">
      <div className="text-sm font-medium text-neutral-900">Select workflow</div>
      <p className="mt-2 text-sm text-neutral-700">Start a family law intake.</p>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => router.push("/case")}
          className="w-full rounded-lg border border-neutral-300 px-4 py-4 text-left text-sm hover:border-neutral-500"
        >
          <div className="text-base font-semibold text-neutral-900">Family Law</div>
          <div className="mt-1 text-sm text-neutral-700">
            Divorce, custody, support, property, and related matters.
          </div>
        </button>
      </div>
    </div>
  );
}

