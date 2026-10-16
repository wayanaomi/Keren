import type { Opportunity, Organization } from "@prisma/client";
import { computeMatch, type MatchOpportunityInput, type MatchOrgInput, type MatchResult } from "./engine";

export function toMatchOrgInput(org: Organization): MatchOrgInput {
  return {
    country: org.country,
    industry: org.industry,
    businessStage: org.businessStage,
    type: org.type,
    annualTurnover: org.annualTurnover,
    fundingRequired: org.fundingRequired,
    employeeCount: org.employeeCount,
    foundedYear: org.foundedYear,
  };
}

export function toMatchOpportunityInput(opp: Opportunity): MatchOpportunityInput {
  return {
    country: opp.country,
    eligibleCountries: opp.eligibleCountries,
    sector: opp.sector,
    industry: opp.industry,
    businessStages: opp.businessStages,
    applicantTypes: opp.applicantTypes,
    minFunding: opp.minFunding,
    maxFunding: opp.maxFunding,
    minRevenue: opp.minRevenue,
    minEmployees: opp.minEmployees,
    eligibilityRequirements: opp.eligibilityRequirements,
  };
}

export function matchOpportunity(org: Organization, opp: Opportunity): MatchResult {
  return computeMatch(toMatchOrgInput(org), toMatchOpportunityInput(opp));
}
