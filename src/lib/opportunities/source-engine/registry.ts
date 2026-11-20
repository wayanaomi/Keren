import type { OpportunitySourceDefinition } from "./types";

/**
 * Only sources with an implemented connector belong here.
 * All database records are created disabled by default.
 */
export const OPPORTUNITY_SOURCE_REGISTRY: OpportunitySourceDefinition[] = [
  {
    key: "grants-gov",
    name: "Grants.gov",
    organization: "United States Government",
    category: "Government grants",
    method: "API",
    opportunityType: "GRANT",
    websiteUrl: "https://www.grants.gov/",
    listingUrl: "https://www.grants.gov/",
    pollIntervalMinutes: 1440,
  },
  {
    key: "ted",
    name: "Tenders Electronic Daily",
    organization: "European Union",
    category: "Public procurement",
    method: "API",
    opportunityType: "TENDER",
    websiteUrl: "https://ted.europa.eu/",
    listingUrl: "https://ted.europa.eu/",
    pollIntervalMinutes: 720,
  },
  {
    key: "afdb-project-procurement",
    name: "African Development Bank — Project Procurement",
    organization: "African Development Bank Group",
    category: "Development project procurement",
    method: "RSS",
    opportunityType: "TENDER",
    websiteUrl: "https://www.afdb.org/en/projects-and-operations/procurement",
    listingUrl: "https://www.afdb.org/en/projects-and-operations/procurement.xml",
    pollIntervalMinutes: 1440,
  },
  {
    key: "fcdo-international-development-funding",
    name: "FCDO — International Development Funding",
    organization: "Foreign, Commonwealth & Development Office",
    category: "International development funding",
    method: "ATOM",
    opportunityType: "OTHER",
    websiteUrl: "https://www.gov.uk/international-development-funding",
    listingUrl:
      "https://www.gov.uk/international-development-funding.atom?fund_state%5B%5D=open",
    pollIntervalMinutes: 1440,
  },
];

export function getOpportunitySourceDefinition(
  key: string,
): OpportunitySourceDefinition | undefined {
  return OPPORTUNITY_SOURCE_REGISTRY.find(
    (source) => source.key === key,
  );
}
