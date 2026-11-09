import { db } from "@/lib/db";

const GRANTS_GOV_API = "https://api.grants.gov/v1/api";

type JsonRecord = Record<string, unknown>;

interface ApiResponse<T> {
  errorcode?: number;
  msg?: string;
  data?: T;
}

interface GrantsGovSearchHit {
  id: string | number;
  title?: string;
  agency?: string;
  agencyCode?: string;
  openDate?: string;
  closeDate?: string;
  oppStatus?: string;
}

interface GrantsGovSearchData {
  oppHits?: GrantsGovSearchHit[];
  hitCount?: number;
}

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object"
    ? (value as JsonRecord)
    : {};
}

function asText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;

  const result = String(value).trim();
  return result.length > 0 ? result : null;
}

function isPlausibleDate(date: Date): Date | null {
  if (Number.isNaN(date.getTime())) return null;

  // Grants.gov sometimes uses far-future placeholder dates for open-ended notices.
  const maximumYear = new Date().getUTCFullYear() + 20;
  if (date.getUTCFullYear() > maximumYear) return null;

  return date;
}

function parseDate(value: unknown): Date | null {
  const input = asText(value);
  if (!input) return null;

  // Grants.gov date format: YYYY-MM-DD-00-00-00
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    const date = new Date(
      Date.UTC(
        Number(isoMatch[1]),
        Number(isoMatch[2]) - 1,
        Number(isoMatch[3]),
      ),
    );

    return isPlausibleDate(date);
  }

  // Grants.gov search date format: MM/DD/YYYY
  const usMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (usMatch) {
    const date = new Date(
      Date.UTC(
        Number(usMatch[3]),
        Number(usMatch[1]) - 1,
        Number(usMatch[2]),
      ),
    );

    return isPlausibleDate(date);
  }

  // Detail API may return human-readable dates with timezone abbreviations.
  const date = new Date(input);
  return isPlausibleDate(date);
}

function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function htmlToText(value: unknown): string {
  const html = asText(value);
  if (!html) return "";

  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&rdquo;/gi, "”")
    .replace(/&ldquo;/gi, "“")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function getDescriptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => asText(asRecord(item).description))
    .filter((item): item is string => Boolean(item));
}

async function postToGrantsGov<T>(
  endpoint: string,
  body: JsonRecord,
): Promise<T> {
  const response = await fetch(`${GRANTS_GOV_API}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(
      `Grants.gov ${endpoint} request failed with HTTP ${response.status}.`,
    );
  }

  const result = (await response.json()) as ApiResponse<T>;

  if (Number(result.errorcode) !== 0 || !result.data) {
    throw new Error(
      asText(result.msg) ?? `Grants.gov ${endpoint} returned an API error.`,
    );
  }

  return result.data;
}

const GRANTS_GOV_SEARCH_TERMS = [
  "small business",
  "entrepreneurship",
] as const;

async function searchGrantsGov(): Promise<GrantsGovSearchHit[]> {
  const searchResults = await Promise.all(
    GRANTS_GOV_SEARCH_TERMS.map(async (keyword) => {
      const data = await postToGrantsGov<GrantsGovSearchData>("search2", {
        rows: 5,
        keyword,
        oppStatuses: "posted",
        startRecordNum: 0,
      });

      return Array.isArray(data.oppHits) ? data.oppHits : [];
    }),
  );

  const uniqueById = new Map<string, GrantsGovSearchHit>();

  for (const hits of searchResults) {
    for (const hit of hits) {
      if (hit.id !== undefined && hit.id !== null) {
        uniqueById.set(String(hit.id), hit);
      }
    }
  }

  // Keep the first import batch deliberately small.
  return Array.from(uniqueById.values()).slice(0, 10);
}

async function fetchGrantsGovOpportunity(
  opportunityId: string | number,
): Promise<JsonRecord> {
  const data = await postToGrantsGov<JsonRecord>("fetchOpportunity", {
    opportunityId: Number(opportunityId),
  });

  return data;
}

function mapGrantsGovOpportunity(
  hit: GrantsGovSearchHit,
  detail: JsonRecord,
) {
  const synopsis = asRecord(detail.synopsis);

  const agencyDetails = asRecord(detail.agencyDetails);
  const topAgencyDetails = asRecord(detail.topAgencyDetails);

  // synopsis.agencyName can be a contact person's name, not the funding agency.
  const funder =
    asText(agencyDetails.agencyName) ??
    asText(topAgencyDetails.agencyName) ??
    asText(hit.agency) ??
    asText(detail.owningAgencyCode) ??
    "Grants.gov funding agency";

  const rawTitle =
    asText(detail.opportunityTitle) ??
    asText(hit.title);

  const title = rawTitle ? htmlToText(rawTitle) : null;

  if (!title) {
    throw new Error(`Opportunity ${hit.id} has no usable title.`);
  }

  const description =
    htmlToText(synopsis.synopsisDesc) ||
    "The official announcement does not include a description in the API response. Review the original Grants.gov notice.";

  const applicantTypes = getDescriptions(synopsis.applicantTypes);
  const fundingInstruments = getDescriptions(synopsis.fundingInstruments);
  const fundingCategories = getDescriptions(
    synopsis.fundingActivityCategories,
  );

  const eligibilityRequirements = [
    ...applicantTypes.map(
      (applicant) => `Eligible applicant category listed by source: ${applicant}.`,
    ),
    "Geographic eligibility has not been confirmed. Review the official announcement before publishing.",
  ];

  const opportunityId = String(hit.id);
  const sourceUrl = `https://www.grants.gov/search-results-detail/${encodeURIComponent(opportunityId)}`;

  const openingDate =
    parseDate(synopsis.postingDateStr) ??
    parseDate(synopsis.postingDate) ??
    parseDate(hit.openDate);

  const deadline =
    parseDate(synopsis.responseDateStr) ??
    parseDate(synopsis.responseDate) ??
    parseDate(detail.originalDueDate) ??
    parseDate(hit.closeDate);

  const keywords = Array.from(
    new Set([
      ...title
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 2),
      ...fundingCategories.map((category) => category.toLowerCase()),
      ...fundingInstruments.map((instrument) => instrument.toLowerCase()),
    ]),
  );

  return {
    title,
    funder,
    type: "GRANT" as const,
    description,

    // The API record does not by itself establish geographic eligibility.
    country: null,
    eligibleCountries: [] as string[],
    sector: null,
    industry: null,
    applicantTypes: [],
    businessStages: [],

    fundingType: fundingInstruments.join(", ") || null,
    fundingAmount: null,
    currency: "USD",
    minFunding: parseAmount(synopsis.awardFloor),
    maxFunding: parseAmount(synopsis.awardCeiling),

    minRevenue: null,
    minEmployees: null,

    openingDate,
    deadline,

    applicationUrl: sourceUrl,
    sourceUrl,
    sourceName: "Grants.gov",

    eligibilityRequirements,
    requiredDocuments: [],
    keywords,

    // Imported records require an administrator to review and publish them.
    status: "DRAFT" as const,
    verificationStatus: "NEEDS_VERIFICATION" as const,
  };
}

export interface GrantsGovImportResult {
  scanned: number;
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
}

export async function importGrantsGovOpportunities(
  adminUserId: string,
): Promise<GrantsGovImportResult> {
  const hits = await searchGrantsGov();

  const result: GrantsGovImportResult = {
    scanned: hits.length,
    imported: 0,
    duplicates: 0,
    skipped: 0,
    failed: 0,
  };

  for (const hit of hits) {
    try {
      if (!hit.id) {
        result.failed += 1;
        continue;
      }

      const detail = await fetchGrantsGovOpportunity(hit.id);
      const opportunity = mapGrantsGovOpportunity(hit, detail);

      if (opportunity.deadline) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const closingDay = new Date(opportunity.deadline);
        closingDay.setUTCHours(0, 0, 0, 0);

        if (closingDay < today) {
          result.skipped += 1;
          continue;
        }
      }

      const existing = await db.opportunity.findFirst({
        where: {
          sourceUrl: opportunity.sourceUrl,
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        result.duplicates += 1;
        continue;
      }

      await db.opportunity.create({
        data: {
          ...opportunity,
          createdById: adminUserId,
        },
      });

      result.imported += 1;
    } catch (error) {
      result.failed += 1;
      console.error(
        `[Grants.gov] Failed to import opportunity ${hit.id}:`,
        error,
      );
    }
  }

  return result;
}
