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
    automated: false,
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
  {
    key: "ncair-opportunities",
    name: "NCAIR — Official Opportunities",
    organization: "National Centre for Artificial Intelligence and Robotics (NCAIR), NITDA",
    category: "Nigerian AI, technology and innovation opportunities",
    method: "RSS",
    opportunityType: "OTHER",
    websiteUrl: "https://ncair.nitda.gov.ng/",
    listingUrl: "https://ncair.nitda.gov.ng/opportunities/",
    feedUrl: "https://ncair.nitda.gov.ng/feed/",
    // The official Opportunities page uses Jobs, Grants and Scholarships
    // categories. Do not ingest general news or learning articles as funding.
    feedCategoryAllowlist: [
      "jobs",
      "grants",
      "scholarships",
    ],
    // Older articles on the publisher page include closed 2025 programmes.
    // Require a recent publication date and retain all accepted records as drafts.
    maxFeedPublicationAgeDays: 180,
    pollIntervalMinutes: 1440,
  },
  {
    key: "tetfund-opportunities",
    name: "TETFund — Official Procurement and Funding Notices",
    organization: "Tertiary Education Trust Fund (TETFund), Nigeria",
    category: "Nigerian public-sector procurement and research funding",
    method: "HTML",
    opportunityType: "OTHER",
    websiteUrl: "https://www.tetfund.gov.ng/",
    listingUrl: "https://www.tetfund.gov.ng/news",
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
