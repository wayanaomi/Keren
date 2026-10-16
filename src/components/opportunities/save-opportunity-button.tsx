"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleSaveOpportunityAction } from "@/app/app/opportunities/actions";

export function SaveOpportunityButton({
  opportunityId,
  initialSaved,
}: {
  opportunityId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleSaveOpportunityAction(opportunityId);
          setSaved(result.saved);
        })
      }
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors",
        saved ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-ink",
      )}
      aria-pressed={saved}
    >
      {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
