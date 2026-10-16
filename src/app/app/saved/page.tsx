import { requireOrganization } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { matchOpportunity } from "@/lib/matching/service";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function SavedOpportunitiesPage() {
  const { organization } = await requireOrganization();

  const saved = await db.savedOpportunity.findMany({
    where: { organizationId: organization.id },
    include: { opportunity: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-bold text-ink">Saved opportunities</h1>
      <p className="mb-5 text-sm text-stone">Opportunities you want to review later.</p>

      {saved.length === 0 ? (
        <EmptyState title="No saved opportunities" body="Save opportunities you want to review later." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {saved.map((s) => (
            <OpportunityCard
              key={s.id}
              opportunity={s.opportunity}
              match={matchOpportunity(organization, s.opportunity)}
              isSaved
            />
          ))}
        </div>
      )}
    </div>
  );
}
