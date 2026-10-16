"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const TYPES = ["GRANT", "TENDER", "RFP", "ACCELERATOR", "COMPETITION", "VC_FUNDING", "LOAN", "PROCUREMENT", "FELLOWSHIP", "PILOT", "OTHER"];
const SORTS: [string, string][] = [
  ["relevance", "Relevance"],
  ["deadline", "Deadline"],
  ["amount", "Funding amount"],
  ["recent", "Recently added"],
];

export function OpportunityFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/app/opportunities?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
        <Input
          placeholder="Search grants, tenders, funding and contracts…"
          defaultValue={searchParams.get("q") ?? ""}
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
          }}
          onBlur={(e) => update("q", e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select
          className="w-auto"
          defaultValue={searchParams.get("type") ?? ""}
          onChange={(e) => update("type", e.target.value)}
        >
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Country"
          className="w-auto"
          defaultValue={searchParams.get("country") ?? ""}
          onBlur={(e) => update("country", e.target.value)}
        />
        <Input
          placeholder="Sector"
          className="w-auto"
          defaultValue={searchParams.get("sector") ?? ""}
          onBlur={(e) => update("sector", e.target.value)}
        />
        <Select
          className="w-auto"
          defaultValue={searchParams.get("sort") ?? "relevance"}
          onChange={(e) => update("sort", e.target.value)}
        >
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 rounded-md border border-line px-3 text-xs font-medium text-ink">
          <input
            type="checkbox"
            defaultChecked={searchParams.get("closingSoon") === "true"}
            onChange={(e) => update("closingSoon", e.target.checked ? "true" : "")}
          />
          Closing soon
        </label>
      </div>
    </div>
  );
}
