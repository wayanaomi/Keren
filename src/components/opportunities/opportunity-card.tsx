import Link from "next/link";
import type { Opportunity } from "@prisma/client";
import { VerificationBadge } from "@/components/ui/badge";
import { Spark } from "@/components/brand/marks";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MatchResult } from "@/lib/matching/engine";
import { matchFitLabel } from "@/lib/matching/engine";
import { SaveOpportunityButton } from "./save-opportunity-button";
import { StartApplicationButton } from "./start-application-button";

const TYPE_LABEL: Record<string, string> = {
  GRANT: "Grant",
  TENDER: "Tender",
  RFP: "RFP",
  ACCELERATOR: "Accelerator",
  COMPETITION: "Competition",
  VC_FUNDING: "VC / Funding",
  LOAN: "Loan",
  PROCUREMENT: "Procurement",
  FELLOWSHIP: "Fellowship",
  PILOT: "Pilot",
  OTHER: "Opportunity",
};

export function OpportunityCard({
  opportunity,
  match,
  isSaved,
}: {
  opportunity: Opportunity;
  match?: MatchResult;
  isSaved?: boolean;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ember">
          {TYPE_LABEL[opportunity.type] ?? opportunity.type}
        </span>
        <VerificationBadge status={opportunity.verificationStatus} />
      </div>

      <Link href={`/app/opportunities/${opportunity.id}`} className="mt-1">
        <h3 className="text-lg font-bold text-ink hover:underline">{opportunity.title}</h3>
      </Link>

      {opportunity.maxFunding ? (
        <p className="text-xl font-extrabold text-ink">
          {formatCurrency(opportunity.maxFunding, opportunity.currency ?? "USD")}
        </p>
      ) : null}

      <p className="text-sm text-stone">
        {[opportunity.sector, [opportunity.country, ...opportunity.eligibleCountries].filter(Boolean).join(" · ")]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink">
        {opportunity.deadline ? `Deadline: ${formatDate(opportunity.deadline)}` : "No deadline set"}
      </p>

      {match ? (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-orange-tint px-3 py-2.5">
          <Spark className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-ink">
              {match.score}% match · {matchFitLabel(match.score)}
            </p>
            {match.potentialBlockers[0] && (
              <p className="text-xs text-stone">⚠ {match.potentialBlockers[0]}</p>
            )}
            {!match.potentialBlockers[0] && match.matchedRequirements[0] && (
              <p className="text-xs text-stone">✓ {match.matchedRequirements[0]}</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-1 items-end gap-2">
        <StartApplicationButton opportunityId={opportunity.id} className="flex-1" />
        <SaveOpportunityButton opportunityId={opportunity.id} initialSaved={Boolean(isSaved)} />
        <Link
          href={`/app/opportunities/${opportunity.id}`}
          className="inline-flex h-9 items-center rounded-md border border-line px-3 text-xs font-semibold text-ink hover:border-ink"
        >
          View
        </Link>
      </div>
    </Card>
  );
}
