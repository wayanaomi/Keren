"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { startApplicationAction } from "@/app/app/opportunities/actions";

export function StartApplicationButton({
  opportunityId,
  className,
}: {
  opportunityId: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => startApplicationAction(opportunityId))}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md bg-orange px-3 text-xs font-semibold text-ink transition-colors hover:bg-ember disabled:opacity-60",
        className,
      )}
    >
      {pending ? "Starting…" : "Start application"}
    </button>
  );
}
