import { getOpportunitySourceDefinition } from "../source-engine/registry";
import { canonicalizeSourceUrl } from "../source-engine/identity";
import { runOpportunitySourceImport } from "../source-engine/runner";
import type {
  NormalizedOpportunitySourceItem,
  OpportunitySourceDefinition,
  OpportunitySourceImportResult,
} from "../source-engine/types";

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 3 * 1024 * 1024;
const MAX_ITEMS_PER_RUN = 60;
const MAX_PUBLICATION_AGE_DAYS = 180;

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const OPPORTUNITY_TITLE_PATTERN = /\b(?:procurement|tenders?|expression of interest|pre[- ]qualification|prequalification|call for proposals?|call for applications?|national research fund|research funding|entrepreneurship development intervention)\b/i;
const TENDER_TITLE_PATTERN = /\b(?:procurement|tenders?|expression of interest|pre[- ]qualification|prequalification|invitation to bid)\b/i;

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
    ndash: "–",
    mdash: "—",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const point = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : " ";
    }
    if (code.startsWith("#")) {
      const point = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : " ";
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function htmlToPlainText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function getAttribute(attributes: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"),
  );
  return match ? htmlToPlainText(match[2]) : null;
}

function makeUtcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function parseListingDate(raw: string): Date | null {
  const value = decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
  let match = value.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (match) {
    return makeUtcDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  match = value.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    return month === undefined
      ? null
      : makeUtcDate(Number(match[3]), month, Number(match[2]));
  }

  match = value.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/);
  if (match) {
    const month = MONTHS[match[2].toLowerCase()];
    return month === undefined
      ? null
      : makeUtcDate(Number(match[3]), month, Number(match[1]));
  }

  return null;
}

function nearestListingDate(
  html: string,
  anchorStart: number,
  anchorEnd: number,
): Date | null {
  let windowStart = Math.max(0, anchorStart - 350);
  let windowEnd = Math.min(html.length, anchorEnd + 350);

  // Prefer a semantic listing card when the publisher supplies one. This
  // prevents a date from an adjacent notice being borrowed by an undated item.
  for (const tag of ["li", "article"]) {
    const openTag = new RegExp(`<${tag}\\b`, "gi");
    let candidateStart = -1;
    for (const match of html.slice(0, anchorStart).matchAll(openTag)) {
      candidateStart = match.index ?? candidateStart;
    }
    const closeTag = `</${tag}>`;
    const closeBefore = html.toLowerCase().lastIndexOf(closeTag, anchorStart);
    if (candidateStart > closeBefore) {
      const closeAfter = html.toLowerCase().indexOf(closeTag, anchorEnd);
      if (closeAfter >= 0) {
        windowStart = candidateStart;
        windowEnd = closeAfter + closeTag.length;
        break;
      }
    }
  }

  const fragment = html.slice(windowStart, windowEnd);
  const patterns = [
    /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
    /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/g,
    /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/g,
  ];
  const anchorCenter = (anchorStart + anchorEnd) / 2 - windowStart;
  const candidates: Array<{ date: Date; distance: number }> = [];

  for (const pattern of patterns) {
    for (const match of fragment.matchAll(pattern)) {
      const date = parseListingDate(match[0]);
      if (!date || match.index === undefined) continue;
      const center = match.index + match[0].length / 2;
      candidates.push({ date, distance: Math.abs(center - anchorCenter) });
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0]?.date ?? null;
}

export interface TETFundListingParseResult {
  items: NormalizedOpportunitySourceItem[];
  scanned: number;
  skipped: number;
}

export function parseTETFundNewsListing(
  html: string,
  source: OpportunitySourceDefinition,
  now: Date = new Date(),
): TETFundListingParseResult {
  const items: NormalizedOpportunitySourceItem[] = [];
  const seen = new Set<string>();
  let scanned = 0;
  let skipped = 0;
  const anchorPattern = /<a\b([^>]*\bhref\s*=\s*(["'])([^"']*\/news\/details\/\d+[^"']*)\2[^>]*)>([\s\S]*?)<\/a\s*>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    scanned += 1;
    if (items.length >= MAX_ITEMS_PER_RUN) break;

    const attributes = match[1] ?? "";
    const href = match[3] ?? "";
    const anchorHtml = match[4] ?? "";
    const title = getAttribute(attributes, "aria-label") ??
      getAttribute(attributes, "title") ??
      htmlToPlainText(anchorHtml);
    const anchorStart = match.index ?? 0;
    const anchorEnd = anchorStart + match[0].length;

    if (!title || !OPPORTUNITY_TITLE_PATTERN.test(title)) {
      skipped += 1;
      continue;
    }

    let sourceUrl: string;
    try {
      sourceUrl = new URL(href, source.listingUrl).toString();
      const parsedUrl = new URL(sourceUrl);

      if (
        parsedUrl.protocol !== "https:" ||
        !["tetfund.gov.ng", "www.tetfund.gov.ng"].includes(
          parsedUrl.hostname.toLowerCase(),
        ) ||
        Boolean(parsedUrl.username || parsedUrl.password) ||
        Boolean(parsedUrl.port) ||
        !/\/news\/details\/\d+\/?$/i.test(parsedUrl.pathname)
      ) {
        skipped += 1;
        continue;
      }
    } catch {
      skipped += 1;
      continue;
    }

    const idMatch = new URL(sourceUrl).pathname.match(/\/news\/details\/(\d+)\/?$/i);
    const publisherId = idMatch?.[1];
    const publishedAt = nearestListingDate(html, anchorStart, anchorEnd);

    if (!publisherId || seen.has(sourceUrl) || !publishedAt) {
      skipped += 1;
      continue;
    }

    const ageMs = now.getTime() - publishedAt.getTime();
    const maxAgeMs = MAX_PUBLICATION_AGE_DAYS * 24 * 60 * 60 * 1000;
    if (ageMs < -24 * 60 * 60 * 1000 || ageMs > maxAgeMs) {
      skipped += 1;
      continue;
    }

    seen.add(sourceUrl);
    const isTender = TENDER_TITLE_PATTERN.test(title);
    const isResearchFunding = /\b(?:national\s+research fund|research funding|research grant)\b/i.test(title);
    const type = isTender ? "TENDER" : isResearchFunding ? "GRANT" : "OTHER";
    const keywords = Array.from(
      new Set(
        title
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((word) => word.length > 2),
      ),
    );
    const externalId = `tetfund-news-${publisherId}`;
    const canonicalUrl = canonicalizeSourceUrl(sourceUrl);

    items.push({
      externalId,
      identityReference: externalId,
      sourceUrl,
      canonicalUrl,
      title: title.slice(0, 500),
      sourceStatus: "PUBLISHED_ON_OFFICIAL_LISTING",
      sourcePublishedAt: publishedAt,
      metadata: {
        publisher: "TETFund",
        publisherListing: source.listingUrl,
        publisherNoticeId: publisherId,
        publicationDateSource: "official listing page",
        fullNoticeRequiresAdminReview: true,
      },
      opportunity: {
        title: title.slice(0, 500),
        funder: source.organization,
        type,
        description: [
          "This item was identified on TETFund's official news listing using procurement and funding-call title filters.",
          "KEREN has not inferred the closing date, funding amount, applicant eligibility or submission route.",
          "An administrator must review the complete official notice before verification or publication.",
        ].join("\n\n"),
        country: "Nigeria",
        eligibleCountries: [],
        sector: null,
        industry: null,
        applicantTypes: [],
        businessStages: [],
        fundingType: null,
        fundingAmount: null,
        currency: null,
        minFunding: null,
        maxFunding: null,
        minRevenue: null,
        minEmployees: null,
        openingDate: publishedAt,
        deadline: null,
        applicationUrl: null,
        sourceUrl,
        sourceName: source.name,
        eligibilityRequirements: [
          "Applicant eligibility has not been confirmed; review the full official notice.",
          "The publication date is not an application deadline.",
          "Do not assume that an institutional intervention notice is open to individual applicants or all organisations.",
        ],
        requiredDocuments: [],
        keywords,
        status: "DRAFT",
        verificationStatus: "NEEDS_VERIFICATION",
      },
    });
  }

  return { items, scanned, skipped };
}

async function readBoundedBody(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("TETFund listing exceeds the allowed response size.");
  }
  if (!response.body) throw new Error("TETFund listing has no readable body.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("TETFund listing exceeds the allowed response size.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(bytes);
}

export async function importTETFundOpportunities(
  adminUserId: string | null,
  trigger: "MANUAL" | "SCHEDULED" | "RETRY" = "MANUAL",
): Promise<OpportunitySourceImportResult> {
  const source = getOpportunitySourceDefinition("tetfund-opportunities");
  if (!source) throw new Error("TETFund source is not registered.");
  if (source.method !== "HTML") {
    throw new Error("TETFund source is not configured as an HTML listing.");
  }

  return runOpportunitySourceImport({
    source,
    adminUserId,
    trigger,fetchItems: async () => {
      const response = await fetch(source.listingUrl, {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "Keren Opportunity Discovery/1.0 (+official source monitoring)",
        },
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`TETFund news listing returned HTTP ${response.status}.`);
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        throw new Error("TETFund listing did not return an HTML document.");
      }

      const html = await readBoundedBody(response);
      const parsed = parseTETFundNewsListing(html, source);
      return {
        items: parsed.items,
        scanned: parsed.scanned,
        skipped: parsed.skipped,
      };
    },
  });
}
