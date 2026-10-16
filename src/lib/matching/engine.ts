import type { BusinessStage, OrganizationType } from "@prisma/client";

/**
 * Deterministic matching engine. This file must never call an LLM — the score
 * is pure arithmetic over structured fields so it is explainable and testable
 * without network access. AI is only used afterwards to phrase the
 * explanation of a result this engine already produced.
 */

export interface MatchOrgInput {
  country: string | null;
  industry: string | null;
  businessStage: BusinessStage | null;
  type: OrganizationType;
  annualTurnover: number | null;
  fundingRequired: number | null;
  employeeCount: number | null;
  foundedYear: number | null;
}

export interface MatchOpportunityInput {
  country: string | null;
  eligibleCountries: string[];
  sector: string | null;
  industry: string | null;
  businessStages: BusinessStage[];
  applicantTypes: OrganizationType[];
  minFunding: number | null;
  maxFunding: number | null;
  minRevenue: number | null;
  minEmployees: number | null;
  eligibilityRequirements: string[];
}

export interface CriterionResult {
  label: string;
  points: number;
  maxPoints: number;
  status: "met" | "unmet" | "unknown" | "not-applicable";
  reason: string;
}

export interface MatchResult {
  score: number;
  breakdown: CriterionResult[];
  matchedRequirements: string[];
  potentialBlockers: string[];
  missingInformation: string[];
}

const WEIGHTS = {
  country: 20,
  industry: 20,
  stage: 15,
  orgType: 15,
  fundingRequirement: 10,
  revenue: 10,
  eligibility: 10,
} as const;

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function matchCountry(org: MatchOrgInput, opp: MatchOpportunityInput): CriterionResult {
  const max = WEIGHTS.country;
  if (opp.eligibleCountries.length === 0 && !opp.country) {
    return { label: "Country", points: max, maxPoints: max, status: "not-applicable", reason: "Open to all countries." };
  }
  if (!org.country) {
    return { label: "Country", points: 0, maxPoints: max, status: "unknown", reason: "Organization country is not set." };
  }
  const eligible = [opp.country, ...opp.eligibleCountries].filter(Boolean).map(normalize);
  const isEligible = eligible.includes(normalize(org.country)) || eligible.includes("global");
  return isEligible
    ? { label: "Country", points: max, maxPoints: max, status: "met", reason: `${org.country} is eligible.` }
    : { label: "Country", points: 0, maxPoints: max, status: "unmet", reason: `${org.country} is not in the eligible countries list.` };
}

function matchIndustry(org: MatchOrgInput, opp: MatchOpportunityInput): CriterionResult {
  const max = WEIGHTS.industry;
  const target = opp.sector || opp.industry;
  if (!target) {
    return { label: "Sector", points: max, maxPoints: max, status: "not-applicable", reason: "No sector restriction." };
  }
  if (!org.industry) {
    return { label: "Sector", points: 0, maxPoints: max, status: "unknown", reason: "Organization industry is not set." };
  }
  const match =
    normalize(org.industry).includes(normalize(target)) || normalize(target).includes(normalize(org.industry));
  return match
    ? { label: "Sector", points: max, maxPoints: max, status: "met", reason: `${target} sector eligible.` }
    : { label: "Sector", points: 0, maxPoints: max, status: "unmet", reason: `This opportunity targets ${target}, not ${org.industry}.` };
}

function matchStage(org: MatchOrgInput, opp: MatchOpportunityInput): CriterionResult {
  const max = WEIGHTS.stage;
  if (opp.businessStages.length === 0) {
    return { label: "Business stage", points: max, maxPoints: max, status: "not-applicable", reason: "No stage restriction." };
  }
  if (!org.businessStage) {
    return { label: "Business stage", points: 0, maxPoints: max, status: "unknown", reason: "Organization business stage is not set." };
  }
  const met = opp.businessStages.includes(org.businessStage);
  return met
    ? { label: "Business stage", points: max, maxPoints: max, status: "met", reason: "Your business stage is eligible." }
    : { label: "Business stage", points: 0, maxPoints: max, status: "unmet", reason: "Your business stage is not eligible for this opportunity." };
}

function matchOrgType(org: MatchOrgInput, opp: MatchOpportunityInput): CriterionResult {
  const max = WEIGHTS.orgType;
  if (opp.applicantTypes.length === 0) {
    return { label: "Organization type", points: max, maxPoints: max, status: "not-applicable", reason: "Open to all organization types." };
  }
  const met = opp.applicantTypes.includes(org.type);
  return met
    ? { label: "Organization type", points: max, maxPoints: max, status: "met", reason: "Your organization type is eligible." }
    : { label: "Organization type", points: 0, maxPoints: max, status: "unmet", reason: "Your organization type is not eligible for this opportunity." };
}

function matchFundingRequirement(org: MatchOrgInput, opp: MatchOpportunityInput): CriterionResult {
  const max = WEIGHTS.fundingRequirement;
  if (opp.minFunding == null && opp.maxFunding == null) {
    return { label: "Funding requirement", points: max, maxPoints: max, status: "not-applicable", reason: "No specific funding range set." };
  }
  if (org.fundingRequired == null) {
    return { label: "Funding requirement", points: 0, maxPoints: max, status: "unknown", reason: "Your funding required amount is not set." };
  }
  const aboveMin = opp.minFunding == null || org.fundingRequired >= opp.minFunding;
  const belowMax = opp.maxFunding == null || org.fundingRequired <= opp.maxFunding;
  const fits = aboveMin && belowMax;
  return fits
    ? { label: "Funding requirement", points: max, maxPoints: max, status: "met", reason: "Your funding need fits this opportunity's range." }
    : { label: "Funding requirement", points: 0, maxPoints: max, status: "unmet", reason: "Your funding need falls outside this opportunity's range." };
}

function matchRevenue(org: MatchOrgInput, opp: MatchOpportunityInput): CriterionResult {
  const max = WEIGHTS.revenue;
  if (opp.minRevenue == null) {
    return { label: "Revenue", points: max, maxPoints: max, status: "not-applicable", reason: "No minimum revenue requirement." };
  }
  if (org.annualTurnover == null) {
    return {
      label: "Revenue",
      points: 0,
      maxPoints: max,
      status: "unknown",
      reason: `Minimum annual revenue requirement is $${opp.minRevenue.toLocaleString()}; your annual turnover is not set.`,
    };
  }
  const met = org.annualTurnover >= opp.minRevenue;
  return met
    ? { label: "Revenue", points: max, maxPoints: max, status: "met", reason: "Your annual turnover meets the minimum requirement." }
    : {
        label: "Revenue",
        points: 0,
        maxPoints: max,
        status: "unmet",
        reason: `Minimum annual revenue requirement is $${opp.minRevenue.toLocaleString()}.`,
      };
}

function matchEligibilityRequirements(org: MatchOrgInput, opp: MatchOpportunityInput): CriterionResult {
  const max = WEIGHTS.eligibility;
  const requirements = opp.eligibilityRequirements;
  if (requirements.length === 0) {
    return { label: "Eligibility requirements", points: max, maxPoints: max, status: "not-applicable", reason: "No additional eligibility requirements listed." };
  }

  // Only one requirement pattern is checkable deterministically today: operating history,
  // inferred from founded year. Everything else is flagged for manual review rather than guessed.
  const operatingHistoryMatch = requirements.find((r) => /(\d+)\s*\+?\s*years?\s+(of\s+)?operating/i.test(r));
  let checkable = 0;
  let metCount = 0;
  const unresolved: string[] = [];

  for (const requirement of requirements) {
    const yearsMatch = requirement.match(/(\d+)\s*\+?\s*years?\s+(of\s+)?operating/i);
    if (yearsMatch) {
      checkable += 1;
      const yearsRequired = Number(yearsMatch[1]);
      if (org.foundedYear == null) {
        unresolved.push(requirement);
        continue;
      }
      const orgYears = new Date().getFullYear() - org.foundedYear;
      if (orgYears >= yearsRequired) metCount += 1;
      else unresolved.push(requirement);
    } else {
      unresolved.push(requirement);
    }
  }

  if (checkable === 0) {
    // Nothing we can verify automatically — award partial credit and ask the user to confirm.
    return {
      label: "Eligibility requirements",
      points: Math.round(max * 0.5),
      maxPoints: max,
      status: "unknown",
      reason: `${requirements.length} requirement(s) listed — review manually to confirm fit.`,
    };
  }

  const points = Math.round((metCount / requirements.length) * max);
  const status: CriterionResult["status"] = unresolved.length === 0 ? "met" : metCount > 0 ? "unknown" : "unmet";
  void operatingHistoryMatch;
  return {
    label: "Eligibility requirements",
    points,
    maxPoints: max,
    status,
    reason: unresolved.length === 0 ? "All checkable requirements are met." : `${unresolved.length} requirement(s) need review: ${unresolved.join("; ")}`,
  };
}

export function computeMatch(org: MatchOrgInput, opp: MatchOpportunityInput): MatchResult {
  const breakdown = [
    matchCountry(org, opp),
    matchIndustry(org, opp),
    matchStage(org, opp),
    matchOrgType(org, opp),
    matchFundingRequirement(org, opp),
    matchRevenue(org, opp),
    matchEligibilityRequirements(org, opp),
  ];

  const score = breakdown.reduce((sum, c) => sum + c.points, 0);

  const matchedRequirements = breakdown.filter((c) => c.status === "met" || c.status === "not-applicable").map((c) => c.reason);
  const potentialBlockers = breakdown.filter((c) => c.status === "unmet").map((c) => c.reason);
  const missingInformation = breakdown.filter((c) => c.status === "unknown").map((c) => c.reason);

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
    matchedRequirements,
    potentialBlockers,
    missingInformation,
  };
}

export function matchFitLabel(score: number): "Strong fit" | "Possible fit" | "Weak fit" {
  if (score >= 75) return "Strong fit";
  if (score >= 45) return "Possible fit";
  return "Weak fit";
}
