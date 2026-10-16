"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { updateApplicationStatusAction } from "@/app/app/applications/actions";
import type { ApplicationStatus } from "@prisma/client";

const STATUSES: ApplicationStatus[] = [
  "SAVED",
  "CONSIDERING",
  "ELIGIBLE",
  "DRAFTING",
  "READY_TO_SUBMIT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "WON",
  "REJECTED",
];

export function ApplicationStatusSelect({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      className="h-8 text-xs"
      defaultValue={currentStatus}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => updateApplicationStatusAction(applicationId, e.target.value as ApplicationStatus))
      }
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </Select>
  );
}
