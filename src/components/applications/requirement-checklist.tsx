"use client";

import { useTransition } from "react";
import type { ApplicationRequirement } from "@prisma/client";
import { toggleRequirementAction } from "@/app/app/applications/actions";

export function RequirementChecklist({ requirements }: { requirements: ApplicationRequirement[] }) {
  const [, startTransition] = useTransition();

  if (requirements.length === 0) {
    return <p className="text-sm text-stone">No required documents listed for this opportunity.</p>;
  }

  return (
    <ul className="space-y-2">
      {requirements.map((r) => (
        <li key={r.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={r.isSatisfied}
            onChange={() => startTransition(() => toggleRequirementAction(r.id))}
            className="h-4 w-4 accent-orange"
          />
          <span className={r.isSatisfied ? "text-sm text-ink line-through" : "text-sm text-ink"}>{r.label}</span>
        </li>
      ))}
    </ul>
  );
}
