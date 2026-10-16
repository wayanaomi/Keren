import { requireOrganization } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import { formatCurrency, deadlineLabel } from "@/lib/utils";
import Link from "next/link";

const COLUMNS: { status: string; label: string }[] = [
  { status: "SAVED", label: "Saved" },
  { status: "CONSIDERING", label: "Considering" },
  { status: "ELIGIBLE", label: "Eligible" },
  { status: "DRAFTING", label: "Drafting" },
  { status: "READY_TO_SUBMIT", label: "Ready to submit" },
  { status: "SUBMITTED", label: "Submitted" },
  { status: "UNDER_REVIEW", label: "Under review" },
  { status: "WON", label: "Won" },
  { status: "REJECTED", label: "Rejected" },
];

export default async function ApplicationPipelinePage() {
  const { organization } = await requireOrganization();

  const applications = await db.application.findMany({
    where: { organizationId: organization.id },
    include: { opportunity: true },
    orderBy: { updatedAt: "desc" },
  });

  if (applications.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-5 text-xl font-bold text-ink">Applications</h1>
        <EmptyState title="No applications yet" body="Start an application from any opportunity." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="mb-5 text-xl font-bold text-ink">Applications</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = applications.filter((a) => a.status === col.status);
          return (
            <div key={col.status} className="w-64 shrink-0">
              <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-stone">
                {col.label} <span className="text-stone">{items.length}</span>
              </h2>
              <div className="space-y-2">
                {items.map((app) => (
                  <div key={app.id} className="rounded-md border border-line bg-white p-3">
                    <Link href={`/app/applications/${app.id}`} className="text-sm font-semibold text-ink hover:underline">
                      {app.opportunity.title}
                    </Link>
                    <p className="text-xs text-stone">
                      {formatCurrency(app.opportunity.maxFunding, app.opportunity.currency ?? "USD")}
                    </p>
                    <p className="text-xs text-stone">{deadlineLabel(app.opportunity.deadline)}</p>
                    <div className="mt-2">
                      <ApplicationStatusSelect applicationId={app.id} currentStatus={app.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
