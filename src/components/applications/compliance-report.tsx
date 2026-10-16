"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { runComplianceCheckAction } from "@/app/app/applications/actions";
import type { ComplianceCheck } from "@prisma/client";

export function ComplianceReport({
  applicationId,
  latest,
}: {
  applicationId: string;
  latest: ComplianceCheck | null;
}) {
  const [pending, startTransition] = useTransition();

  const missingItems = (latest?.missingItems as string[]) ?? [];
  const conflicts = (latest?.conflicts as { field: string; applicationValue: string; profileValue: string }[]) ?? [];
  const warnings = (latest?.warnings as string[]) ?? [];

  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Application readiness</h2>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => startTransition(async () => { await runComplianceCheckAction(applicationId); window.location.reload(); })}
        >
          {pending ? "Checking…" : "Run check"}
        </Button>
      </div>

      {!latest ? (
        <p className="mt-2 text-sm text-stone">Run a check to see your application readiness.</p>
      ) : (
        <>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full bg-orange" style={{ width: `${latest.completionPercentage}%` }} />
          </div>
          <p className="mt-1 text-sm font-bold text-ink">{latest.completionPercentage}% ready</p>

          {missingItems.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-warn">Missing</p>
              <ul className="list-disc pl-4 text-sm text-ink">
                {missingItems.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-danger">Issues</p>
              <ul className="list-disc pl-4 text-sm text-ink">
                {conflicts.map((c) => (
                  <li key={c.field}>
                    {c.field}: application says {c.applicationValue}, profile says {c.profileValue}.
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-stone">Warnings</p>
              <ul className="list-disc pl-4 text-sm text-ink">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
