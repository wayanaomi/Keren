import { db } from "@/lib/db";

const TED_SEARCH_API = "https://api.ted.europa.eu/v3/notices/search";
const DAYS_TO_SEARCH = 30;
const PAGE_SIZE = 100;
const MAX_PAGES_PER_RUN = 5;
const MAX_IMPORTS_PER_RUN = 25;

type JsonRecord = Record<string, unknown>;

interface TedSearchResponse {
  notices?: JsonRecord[];
  totalNoticeCount?: number;
}

export interface TedImportResult {
  scanned: number;
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
  totalAvailable: number;
}

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const result = String(value).trim();
  return result.length > 0 ? result : null;
}

/**
 * TED returns some fields as multilingual objects and others as arrays.
 * Prefer English when available, otherwise use the first available language.
 */
function textValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(textValues);
  }

  const direct = asText(value);
  if (direct) return [direct];

  if (value && typeof value === "object") {
    const record = asRecord(value);
    const english = record.ENG ?? record.eng;

    if (english !== undefined) {
      return textValues(english);
    }

    return Object.values(record).flatMap(textValues);
  }

  return [];
}

function displayText(value: unknown): string | null {
  const values = Array.from(new Set(textValues(value)));
  return values.length > 0 ? values.join(", ") : null;
}

/**
 * TED date values can look like 2026-11-17+01:00.
 * Store the calendar date as UTC midnight to avoid shifting the deadline.
 */
function parseTedDate(value: unknown): Date | null {
  const input = asText(value);
  if (!input) return null;

  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function utcDayStart(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function tedDateToken(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function getSearchQuery(): string {
  const today = utcDayStart();
  const publicationCutoff = new Date(today);

  publicationCutoff.setUTCDate(
    publicationCutoff.getUTCDate() - DAYS_TO_SEARCH,
  );

  return [
    `publication-date>=${tedDateToken(publicationCutoff)}`,
    "notice-type = cn-standard",
    `deadline-receipt-tender-date-lot>=${tedDateToken(today)}`,
    "SORT BY publication-date DESC",
  ].join(" AND ");
}

async function searchTedPage(page: number): Promise<TedSearchResponse> {
  const response = await fetch(TED_SEARCH_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: getSearchQuery(),
      fields: [
        "publication-number",
        "notice-title",
        "notice-type",
        "buyer-name",
        "buyer-country",
        "classification-cpv",
        "publication-date",
        "deadline-receipt-tender-date-lot",
        "links",
      ],
      page,
      limit: PAGE_SIZE,
      scope: "ACTIVE",
      paginationMode: "PAGE_NUMBER",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `TED search failed with HTTP ${response.status}: ${responseText.slice(0, 500)}`,
    );
  }

  let result: TedSearchResponse;

  try {
    result = JSON.parse(responseText) as TedSearchResponse;
  } catch {
    throw new Error("TED returned a response that was not valid JSON.");
  }

  if (!Array.isArray(result.notices)) {
    throw new Error("TED response did not contain a notices array.");
  }

  return result;
}

function mapTedNotice(notice: JsonRecord) {
  const publicationNumber = asText(notice["publication-number"]);

  if (!publicationNumber) {
    throw new Error("TED notice has no publication number.");
  }

  const title = displayText(notice["notice-title"]);

  if (!title) {
    throw new Error(`TED notice ${publicationNumber} has no usable title.`);
  }

  const buyerName =
    displayText(notice["buyer-name"]) ??
    "TED contracting authority (buyer not identified)";

  const buyerCountries = Array.from(
    new Set(
      textValues(notice["buyer-country"]).map((value) =>
        value.toUpperCase(),
      ),
    ),
  );

  const cpvCodes = Array.from(
    new Set(textValues(notice["classification-cpv"])),
  );

  const rawDeadlineValues = Array.from(
    new Set(textValues(notice["deadline-receipt-tender-date-lot"])),
  );

  const validDeadlines = rawDeadlineValues
    .map(parseTedDate)
    .filter((value): value is Date => value !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  const deadline = validDeadlines[0] ?? null;
  const openingDate = parseTedDate(notice["publication-date"]);

  const links = asRecord(notice.links);
  const htmlLinks = asRecord(links.html);
  const directHtmlLinks = asRecord(links.htmlDirect);

  const sourceUrl =
    asText(htmlLinks.ENG) ??
    asText(htmlLinks.eng) ??
    asText(directHtmlLinks.ENG) ??
    `https://ted.europa.eu/en/notice/-/detail/${encodeURIComponent(publicationNumber)}`;

  const deadlineNote =
    rawDeadlineValues.length > 1
      ? `The source lists multiple lot deadlines: ${rawDeadlineValues.join(", ")}. The earliest date is used as the initial listing deadline.`
      : rawDeadlineValues.length === 1
        ? `Deadline listed by TED: ${rawDeadlineValues[0]}.`
        : "TED did not provide a usable deadline.";

  const description = [
    title,
    "",
    "Source: Tenders Electronic Daily (TED), the EU public procurement notice service.",
    `Publication number: ${publicationNumber}.`,
    `Contracting authority / buyer: ${buyerName}.`,
    buyerCountries.length > 0
      ? `Buyer country code(s): ${buyerCountries.join(", ")}. These identify the contracting authority's location, not supplier eligibility or place of performance.`
      : "Buyer country was not supplied in the search result.",
    cpvCodes.length > 0
      ? `CPV classification code(s): ${cpvCodes.join(", ")}.`
      : "CPV classification codes were not supplied in the search result.",
    deadlineNote,
    "",
    "This record contains metadata returned by the TED search API. Review the official notice for the full procurement description, lots, documents, place of performance, bidder eligibility, submission method and tender instructions.",
  ].join("\n");

  const eligibilityRequirements = [
    "Bidder eligibility has not been extracted or confirmed. Review the official TED notice and its tender documents.",
    "The buyer's country is not evidence of supplier eligibility or place of performance.",
    "Technical, financial, legal and other tender requirements must be checked in the official notice.",
  ];

  const keywords = Array.from(
    new Set([
      "TED",
      "public procurement",
      ...title
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 2),
      ...cpvCodes,
      ...buyerCountries,
    ]),
  );

  return {
    title,
    funder: buyerName,
    type: "TENDER" as const,
    description,

    // Buyer location is deliberately not mapped to supplier geography.
    country: null,
    eligibleCountries: [] as string[],
    sector: null,
    industry: null,
    applicantTypes: [],
    businessStages: [],

    fundingType: "Public procurement tender",
    fundingAmount: null,
    currency: null,
    minFunding: null,
    maxFunding: null,

    minRevenue: null,
    minEmployees: null,

    openingDate,
    deadline,

    // TED's detail page is the official source, not necessarily the bid portal.
    applicationUrl: null,
    sourceUrl,
    sourceName: "TED (Tenders Electronic Daily)",

    eligibilityRequirements,
    requiredDocuments: [],
    keywords,

    status: "DRAFT" as const,
    verificationStatus: "NEEDS_VERIFICATION" as const,
  };
}

export async function importTedOpportunities(
  adminUserId: string,
): Promise<TedImportResult> {
  const result: TedImportResult = {
    scanned: 0,
    imported: 0,
    duplicates: 0,
    skipped: 0,
    failed: 0,
    totalAvailable: 0,
  };

  const today = utcDayStart();

  for (
    let page = 1;
    page <= MAX_PAGES_PER_RUN && result.imported < MAX_IMPORTS_PER_RUN;
    page += 1
  ) {
    const searchResult = await searchTedPage(page);
    const notices = searchResult.notices ?? [];

    if (page === 1) {
      result.totalAvailable = Number(searchResult.totalNoticeCount ?? 0);
    }

    if (notices.length === 0) break;

    for (const notice of notices) {
      if (result.imported >= MAX_IMPORTS_PER_RUN) break;

      result.scanned += 1;

      const publicationNumber =
        asText(notice["publication-number"]) ?? "unknown";

      try {
        const opportunity = mapTedNotice(notice);

        if (!opportunity.deadline) {
          result.skipped += 1;
          continue;
        }

        if (opportunity.deadline < today) {
          result.skipped += 1;
          continue;
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
          `[TED] Failed to import notice ${publicationNumber}:`,
          error,
        );
      }
    }

    if (notices.length < PAGE_SIZE) break;
  }

  return result;
}
