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
    <label
      className={
        "flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-sm" +
        (compact ? " w-full justify-between" : "")
      }
    >
      <span className={compact ? "" : "hidden lg:inline"}>Case Type</span>

      <select
        className="bg-transparent text-sm font-medium text-zinc-900 outline-none"
        value="family"
        onChange={() => router.push("/case")}
        aria-label="Select case type"
      >
        <option value="family">Family Law</option>
      </select>
    </label>
  );
}


