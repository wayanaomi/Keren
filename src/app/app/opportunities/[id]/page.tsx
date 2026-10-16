import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/auth/session";
import { getOpportunityById } from "@/lib/opportunities/queries";
import { matchOpportunity } from "@/lib/matching/service";
import { buildOpportunityBrief } from "@/lib/opportunities/brief";
import { db } from "@/lib/db";
import { VerificationBadge } from "@/components/ui/badge";
import { Spark } from "@/components/brand/marks";
import { formatCurrency, formatDate, deadlineLabel } from "@/lib/utils";
import { SaveOpportunityButton } from "@/components/opportunities/save-opportunity-button";
import { StartApplicationButton } from "@/components/opportunities/start-application-button";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization } = await requireOrganization();

  const opportunity = await getOpportunityById(id);
  if (!opportunity) notFound();

  const saved = await db.savedOpportunity.findUnique({
    where: { organizationId_opportunityId: { organizationId: organization.id, opportunityId: id } },
  });

  const match = matchOpportunity(organization, opportunity);
  const brief = buildOpportunityBrief(opportunity, match);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-ember">{opportunity.type}</span>
          <VerificationBadge status={opportunity.verificationStatus} />
        </div>
        <h1 className="mt-1 text-2xl font-bold text-ink">{opportunity.title}</h1>
        <p className="text-sm text-stone">{opportunity.funder}</p>

        <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-4">
          <Stat label="Amount" value={formatCurrency(opportunity.maxFunding, opportunity.currency ?? "USD")} />
          <Stat label="Deadline" value={formatDate(opportunity.deadline)} sub={deadlineLabel(opportunity.deadline)} />
          <Stat label="Country" value={opportunity.country || "Multiple"} />
          <Stat label="Sector" value={opportunity.sector || "Open"} />
        </div>

        <div className="mt-4 flex gap-2">
          <StartApplicationButton opportunityId={opportunity.id} className="h-10 px-4 text-sm" />
          <SaveOpportunityButton opportunityId={opportunity.id} initialSaved={Boolean(saved)} />
          {opportunity.applicationUrl && (
            <a
              href={opportunity.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-ink hover:border-ink"
            >
              External application
            </a>
          )}
        </div>
      </div>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
          <Spark /> Keren&apos;s Brief
        </h2>
        <dl className="space-y-3 text-sm">
          <BriefRow label="What is this?" value={brief.whatIsThis} />
          <BriefRow label="Who is it for?" value={brief.whoIsItFor} />
          <BriefRow label="How much can you receive?" value={brief.howMuch} />
          <BriefRow label="Who qualifies?" value={brief.whoQualifies} />
          <BriefRow label="What do you need?" value={brief.whatYouNeed} />
        </dl>

        <div className="mt-4 rounded-md bg-orange-tint p-3">
          <p className="text-sm font-bold text-ink">
            Should you investigate? {brief.shouldYouInvestigate.fit}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-stone">
            {brief.shouldYouInvestigate.evidence.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-ink">
          {match.score}% match
        </h2>
        <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {match.breakdown.map((c) => (
            <div key={c.label} className="flex items-center justify-between border-b border-line py-1.5 text-sm">
              <span className="text-ink">{c.label}</span>
              <span className={c.status === "unmet" ? "text-danger" : c.status === "unknown" ? "text-warn" : "text-verified"}>
                {c.points}/{c.maxPoints}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-2 text-base font-bold text-ink">Eligibility</h2>
        {opportunity.eligibilityRequirements.length === 0 ? (
          <p className="text-sm text-stone">No structured eligibility requirements listed.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {opportunity.eligibilityRequirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-2 text-base font-bold text-ink">Required documents</h2>
        {opportunity.requiredDocuments.length === 0 ? (
          <p className="text-sm text-stone">No required documents listed yet.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {opportunity.requiredDocuments.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-2 text-base font-bold text-ink">Source</h2>
        <p className="text-sm text-ink">{opportunity.sourceName || "Not specified"}</p>
        {opportunity.sourceUrl && (
          <a href={opportunity.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-ember underline">
            {opportunity.sourceUrl}
          </a>
        )}
        <p className="mt-1 text-xs text-stone">
          Last verified: {opportunity.lastVerifiedAt ? formatDate(opportunity.lastVerifiedAt) : "Not yet verified"}
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-stone">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
      {sub && <p className="text-xs text-stone">{sub}</p>}
    </div>
  );
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-stone">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
