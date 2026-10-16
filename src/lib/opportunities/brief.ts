import type { Opportunity } from "@prisma/client";
import type { MatchResult } from "@/lib/matching/engine";
import { matchFitLabel } from "@/lib/matching/engine";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface OpportunityBrief {
  whatIsThis: string;
  whoIsItFor: string;
  howMuch: string;
  whoQualifies: string;
  whatYouNeed: string;
  shouldYouInvestigate: { fit: "Strong fit" | "Possible fit" | "Weak fit"; evidence: string[] };
}

/**
 * Keren's Brief is built entirely from structured, verified opportunity fields (and the
 * deterministic match result, when available) — no AI call, so there is nothing to fabricate.
 */
export function buildOpportunityBrief(opportunity: Opportunity, match?: MatchResult): OpportunityBrief {
  const audience = [
    opportunity.applicantTypes.join(", ") || null,
    opportunity.sector ? `in ${opportunity.sector}` : null,
    opportunity.country || opportunity.eligibleCountries.length
      ? `based in ${[opportunity.country, ...opportunity.eligibleCountries].filter(Boolean).join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    whatIsThis: opportunity.description,
    whoIsItFor: audience || "Eligibility is not restricted by sector, country or organization type.",
    howMuch: opportunity.minFunding || opportunity.maxFunding
      ? `${formatCurrency(opportunity.minFunding, opportunity.currency ?? "USD")} – ${formatCurrency(opportunity.maxFunding, opportunity.currency ?? "USD")}`
      : "Funding amount not disclosed.",
    whoQualifies:
      opportunity.eligibilityRequirements.length > 0
        ? opportunity.eligibilityRequirements.join("; ")
        : "No additional eligibility requirements listed.",
    whatYouNeed:
      opportunity.requiredDocuments.length > 0
        ? opportunity.requiredDocuments.join(", ")
        : "No required documents listed yet.",
    shouldYouInvestigate: {
      fit: match ? matchFitLabel(match.score) : "Possible fit",
      evidence: match
        ? [...match.matchedRequirements.slice(0, 2), ...match.potentialBlockers.slice(0, 2)]
        : [`Deadline: ${formatDate(opportunity.deadline)}`],
    },
  };
}
