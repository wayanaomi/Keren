import type { Founder, KnowledgeDocument, Organization } from "@prisma/client";

/**
 * Builds the single structured "known facts" object that AI services are allowed
 * to draw from. Only fields the user has actually filled in are included — nothing
 * is inferred or defaulted, so missing fields surface as genuinely missing.
 */
export function buildOrganizationFacts(
  org: Organization,
  founders: Founder[],
  documents: Pick<KnowledgeDocument, "name" | "type" | "extractedSummary">[],
) {
  const facts: Record<string, unknown> = {};

  const set = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value) && value.length === 0) return;
    facts[key] = value;
  };

  set("name", org.name);
  set("website", org.website);
  set("country", org.country);
  set("city", org.city);
  set("type", org.type);
  set("foundedYear", org.foundedYear);
  set("industry", org.industry);
  set("description", org.description);
  set("businessModel", org.businessModel);
  set("productsServices", org.productsServices);
  set("targetCustomers", org.targetCustomers);
  set("marketsServed", org.marketsServed);
  set("revenueRange", org.revenueRange);
  set("employeeCount", org.employeeCount);
  set("annualTurnover", org.annualTurnover);
  set("fundingStage", org.fundingStage);
  set("previousFunding", org.previousFunding);
  set("amountRaised", org.amountRaised);
  set("fundingRequired", org.fundingRequired);
  set("preferredFundingType", org.preferredFundingType);
  set("socialImpact", org.socialImpact);
  set("environmentalImpact", org.environmentalImpact);
  set("sdgs", org.sdgs);
  set("beneficiaries", org.beneficiaries);
  set("geographicImpact", org.geographicImpact);
  set("services", org.services);
  set("certifications", org.certifications);
  set("previousContracts", org.previousContracts);
  set("previousProjects", org.previousProjects);
  set("areasOfExpertise", org.areasOfExpertise);

  if (founders.length > 0) {
    facts.founders = founders.map((f) => ({
      name: f.name,
      role: f.role,
      experience: f.experience,
      bio: f.bio,
    }));
  }

  if (documents.length > 0) {
    facts.uploadedDocuments = documents.map((d) => ({
      name: d.name,
      type: d.type,
      summary: d.extractedSummary,
    }));
  }

  return facts;
}

/** Required-for-a-complete-profile fields, used to compute profile completeness. */
export const ORGANIZATION_CORE_FIELDS: (keyof Organization)[] = [
  "name",
  "website",
  "country",
  "city",
  "type",
  "foundedYear",
  "industry",
  "description",
  "businessModel",
  "revenueRange",
  "employeeCount",
  "annualTurnover",
  "fundingRequired",
];

export function computeProfileCompleteness(org: Organization): number {
  const filled = ORGANIZATION_CORE_FIELDS.filter((key) => {
    const value = org[key];
    return value !== null && value !== undefined && value !== "";
  });
  return Math.round((filled.length / ORGANIZATION_CORE_FIELDS.length) * 100);
}
