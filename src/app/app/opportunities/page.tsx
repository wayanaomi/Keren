import { requireOrganization } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listOpportunities } from "@/lib/opportunities/queries";
import { opportunityFilterSchema } from "@/lib/validators/opportunity";
import { matchOpportunity } from "@/lib/matching/service";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { OpportunityFilters } from "@/components/opportunities/opportunity-filters";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DiscoverOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { organization } = await requireOrganization();
  const params = await searchParams;
  const filters = opportunityFilterSchema.parse(params);

  const [opportunities, saved] = await Promise.all([
    listOpportunities(filters),
    db.savedOpportunity.findMany({ where: { organizationId: organization.id }, select: { opportunityId: true } }),
  ]);
  const savedIds = new Set(saved.map((s) => s.opportunityId));

  let withMatches = opportunities.map((opp) => ({ opp, match: matchOpportunity(organization, opp) }));
  if (filters.sort === "match" || !filters.sort || filters.sort === "relevance") {
    withMatches = withMatches.sort((a, b) => b.match.score - a.match.score);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-bold text-ink">Discover opportunities</h1>
      <p className="mb-5 text-sm text-stone">Search grants, tenders, funding and contracts.</p>

      <OpportunityFilters />

      <div className="mt-6">
        {withMatches.length === 0 ? (
          <EmptyState
            title="No opportunities yet"
            body="Opportunities will appear here once they are added by Keren's team or an administrator."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {withMatches.map(({ opp, match }) => (
              <OpportunityCard key={opp.id} opportunity={opp} match={match} isSaved={savedIds.has(opp.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
