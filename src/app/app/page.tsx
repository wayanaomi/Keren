import Link from "next/link";
import { requireOrganization } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { matchOpportunity } from "@/lib/matching/service";
import { computeProfileCompleteness } from "@/lib/organization/context";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";

export default async function PersonalizedFeedPage() {
  const { organization } = await requireOrganization();

  const [opportunities, saved] = await Promise.all([
    db.opportunity.findMany({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.savedOpportunity.findMany({ where: { organizationId: organization.id }, select: { opportunityId: true } }),
  ]);
  const savedIds = new Set(saved.map((s) => s.opportunityId));

  const completeness = computeProfileCompleteness(organization);

  const ranked = opportunities
    .map((opp) => ({ opp, match: matchOpportunity(organization, opp) }))
    .filter(({ match }) => match.score > 0)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-bold text-ink">Opportunities for you</h1>
      <p className="mb-5 text-sm text-stone">
        {opportunities.length === 0
          ? "No opportunities in the database yet."
          : `${ranked.length} opportunities match your profile`}
      </p>

      {completeness < 100 && (
        <div className="mb-5 flex items-center justify-between rounded-md border border-line bg-white px-4 py-3">
          <p className="text-sm text-ink">
            Your organization profile is {completeness}% complete. Complete it to improve match accuracy.
          </p>
          <Link href="/app/organization" className={buttonClasses("secondary", "sm")}>
            Complete profile
          </Link>
        </div>
      )}

      {opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          body="Opportunities will appear here once they are added or imported by an administrator."
        />
      ) : ranked.length === 0 ? (
        <EmptyState
          title="No matches yet"
          body="Keren could not find a fit from the opportunities currently available. Browse all opportunities or complete your profile."
          action={
            <Link href="/app/opportunities" className={buttonClasses("primary", "sm")}>
              Browse all opportunities
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ranked.map(({ opp, match }) => (
            <OpportunityCard key={opp.id} opportunity={opp} match={match} isSaved={savedIds.has(opp.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
