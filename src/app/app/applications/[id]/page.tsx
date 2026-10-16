import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { VerificationBadge } from "@/components/ui/badge";
import { AnswerCard } from "@/components/applications/answer-card";
import { RequirementChecklist } from "@/components/applications/requirement-checklist";
import { ComplianceReport } from "@/components/applications/compliance-report";
import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ApplicationWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization } = await requireOrganization();

  const application = await db.application.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      opportunity: true,
      answers: { orderBy: { createdAt: "asc" } },
      requirements: true,
      complianceChecks: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!application) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ember">{application.opportunity.type}</p>
          <h1 className="text-xl font-bold text-ink">{application.opportunity.title}</h1>
          <p className="text-sm text-stone">
            {formatCurrency(application.opportunity.maxFunding, application.opportunity.currency ?? "USD")} · Deadline{" "}
            {formatDate(application.opportunity.deadline)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VerificationBadge status={application.opportunity.verificationStatus} />
          <ApplicationStatusSelect applicationId={application.id} currentStatus={application.status} />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Required documents</h2>
        <RequirementChecklist requirements={application.requirements} />
      </div>

      <ComplianceReport applicationId={application.id} latest={application.complianceChecks[0] ?? null} />

      <div>
        <h2 className="mb-3 text-base font-bold text-ink">Application questions</h2>
        {application.answers.length === 0 ? (
          <EmptyState
            title="No questions yet"
            body="This opportunity has no application questions configured. An admin can add them to the opportunity record."
          />
        ) : (
          <div className="space-y-4">
            {application.answers.map((answer) => (
              <AnswerCard key={answer.id} answer={answer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
