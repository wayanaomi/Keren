import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  getOpportunitySourceDefinition,
} from "./registry";
import {
  canonicalizeSourceUrl,
} from "./identity";
import {
  runOpportunitySourceImport,
} from "./runner";

import {
  enrichGovUkFeedItem,
  getGovUkContentApiUrl,
} from "./govuk";
import type {
  NormalizedOpportunitySourceItem,
  OpportunitySourceDefinition,
  OpportunitySourceImportResult,
} from "./types";

type XmlRecord = Record<string, unknown>;

const MAX_FEED_BYTES = 5 * 1024 * 1024;
const MAX_FEED_ITEMS = 250;
const MAX_DESCRIPTION_LENGTH = 12_000;
const REQUEST_TIMEOUT_MS = 25_000;

const FETCH_ATTEMPTS = 2;
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

async function fetchWithRetry(
  url: string,
  init: Omit<RequestInit, "signal">,
  label: string,
): Promise<Response> {
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (attempt === FETCH_ATTEMPTS) {
        console.error(
          `[Opportunity feed] ${label} failed after ${attempt} attempts:`,
          error,
        );
        throw error;
      }

      console.warn(
        `[Opportunity feed] ${label} connection failed; retrying once.`,
      );
      await new Promise((resolve) => setTimeout(resolve, 800));
      continue;
    }

    if (
      !RETRYABLE_HTTP_STATUSES.has(response.status) ||
      attempt === FETCH_ATTEMPTS
    ) {
      return response;
    }

    try {
      await response.body?.cancel();
    } catch {
      // Preserve the original HTTP response retry.
    }

    console.warn(
      `[Opportunity feed] ${label} returned HTTP ${response.status}; retrying once.`,
    );
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  throw new Error(`${label} failed after retrying.`);
}


const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

function asRecord(value: unknown): XmlRecord {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as XmlRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = textValue(item);
      if (text) return text;
    }
  }

  if (value && typeof value === "object") {
    const record = asRecord(value);

    return (
      textValue(record["#text"]) ??
      textValue(record["#cdata"]) ??
      null
    );
  }

  return null;
}

function firstText(
  record: XmlRecord,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = textValue(record[key]);
    if (value) return value;
  }

  return null;
}

function getFeedEntryLink(value: unknown): string | null {
  for (const candidate of asArray(value)) {
    if (typeof candidate === "string") {
      const link = candidate.trim();
      if (link) return link;
      continue;
    }

    const record = asRecord(candidate);

    const href =
      textValue(record["@_href"]) ??
      textValue(record.href);

    const rel =
      textValue(record["@_rel"]) ??
      textValue(record.rel);

    if (href && (!rel || rel === "alternate")) {
      return href;
    }
  }

  return null;
}

function htmlToText(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function parseFeedDate(value: string | null): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeFeedCategory(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function getFeedEntryCategories(entry: XmlRecord): string[] {
  return Array.from(
    new Set(
      asArray(entry.category)
        .map((value) => {
          if (typeof value === "string" || typeof value === "number") {
            return String(value).trim();
          }
          const record = asRecord(value);
          return (
            textValue(record["@_term"]) ??
            textValue(record["#text"]) ??
            textValue(record["@_label"]) ??
            ""
          );
        })
        .map(normalizeFeedCategory)
        .filter(Boolean),
    ),
  );
}

export function isFeedEntryWithinConfiguredScope(
  entry: XmlRecord,
  source: OpportunitySourceDefinition,
  publishedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (source.feedCategoryAllowlist?.length) {
    const allowed = new Set(
      source.feedCategoryAllowlist.map(normalizeFeedCategory),
    );
    const categories = getFeedEntryCategories(entry);
    if (!categories.some((category) => allowed.has(category))) return false;
  }

  if (source.maxFeedPublicationAgeDays !== undefined) {
    const maxAgeDays = source.maxFeedPublicationAgeDays;
    if (!Number.isFinite(maxAgeDays) || maxAgeDays < 1 || !publishedAt) {
      return false;
    }

    const ageMs = now.getTime() - publishedAt.getTime();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    // Skip future-dated feed entries instead of letting malformed publisher
    // timestamps make a notice appear newer than it is.
    if (ageMs < -24 * 60 * 60 * 1000 || ageMs > maxAgeMs) {
      return false;
    }
  }

  return true;
}

function getFeedOpportunityType(
  source: OpportunitySourceDefinition,
  categories: string[],
): NonNullable<OpportunitySourceDefinition["opportunityType"]> {
  if (categories.includes("grants")) return "GRANT";
  if (categories.includes("fellowships")) return "FELLOWSHIP";
  if (categories.includes("competitions")) return "COMPETITION";
  if (categories.includes("tenders") || categories.includes("procurement")) {
    return "TENDER";
  }
  return source.opportunityType ?? "OTHER";
}

export function parseFeedEntries(
  xml: string,
  method: "RSS" | "ATOM",
): XmlRecord[] {
  if (/<!DOCTYPE/i.test(xml)) {
    throw new Error("Feed documents containing DOCTYPE are not accepted.");
  }

  const validation = XMLValidator.validate(xml);

  if (validation !== true) {
    throw new Error("The source returned malformed XML.");
  }

  const parsed = parser.parse(xml);
  const root = asRecord(parsed);

  if (method === "RSS") {
    const rssChannel = asRecord(asRecord(root.rss).channel);
    const rdfRoot = asRecord(root["rdf:RDF"]);

    const entries =
      rssChannel.item ??
      rdfRoot.item;

    if (entries === undefined) {
      throw new Error("RSS document does not contain channel items.");
    }

    return asArray(entries).map(asRecord);
  }

  const atomFeed = asRecord(root.feed);

  if (atomFeed.entry === undefined) {
    throw new Error("Atom document does not contain feed entries.");
  }

  return asArray(atomFeed.entry).map(asRecord);
}

export function normalizeFeedEntries(
  entries: XmlRecord[],
  source: OpportunitySourceDefinition,
  now: Date = new Date(),
): {
  items: NormalizedOpportunitySourceItem[];
  skipped: number;
} {
  const items: NormalizedOpportunitySourceItem[] = [];
  let skipped = 0;

  for (const entry of entries) {
    try {
      const titleValue = firstText(entry, ["title"]);
      const title = titleValue
        ? htmlToText(titleValue).slice(0, 500)
        : "";

      const rawLink = getFeedEntryLink(entry.link);
      const publisherReference = firstText(entry, ["guid", "id"]);
      const externalId = publisherReference ?? rawLink;

      if (!title || !rawLink || !externalId) {
        skipped += 1;
        continue;
      }

      const sourceUrl = new URL(
        rawLink,
        source.websiteUrl,
      ).toString();

      const canonicalUrl = canonicalizeSourceUrl(sourceUrl);

      const publishedValue = firstText(entry, [
        "pubDate",
        "published",
        "dc:date",
        "date",
      ]);

      const updatedValue = firstText(entry, [
        "updated",
        "modified",
        "dcterms:modified",
      ]);

      const publishedAt = parseFeedDate(publishedValue);
      const updatedAt = parseFeedDate(updatedValue);
      const categories = getFeedEntryCategories(entry);

      if (!isFeedEntryWithinConfiguredScope(entry, source, publishedAt, now)) {
        skipped += 1;
        continue;
      }

      const contentValue = firstText(entry, [
        "content:encoded",
        "description",
        "summary",
        "content",
      ]);

      const summary = contentValue
        ? htmlToText(contentValue).slice(0, MAX_DESCRIPTION_LENGTH)
        : "";

      const description = [
        summary || "The feed did not supply a detailed description.",
        "",
        `Discovered from the official ${source.name} feed.`,
        "Review the original notice for eligibility, deadlines, funding terms and application instructions.",
      ].join("\n");

      const keywords = Array.from(
        new Set(
          title
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((word) => word.length > 2),
        ),
      );

      const safeExternalId = externalId.trim().slice(0, 1000);

      items.push({
        externalId: safeExternalId,
        identityReference: publisherReference,
        sourceUrl,
        canonicalUrl,
        title,
        sourceStatus: "PUBLISHED_IN_FEED",
        sourcePublishedAt: publishedAt,
        sourceUpdatedAt: updatedAt,
        metadata: {
          feedMethod: source.method,
          feedEntryId: safeExternalId,
          feedCategories: categories,
        },
        opportunity: {
          title,
          funder: source.organization,
          type: getFeedOpportunityType(source, categories),
          description,

          country: null,
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
            "Applicant eligibility has not been confirmed. Review the official source notice.",
            "Geographic eligibility has not been confirmed.",
            "The publication date is not an application deadline.",
          ],
          requiredDocuments: [],
          keywords,

          status: "DRAFT",
          verificationStatus: "NEEDS_VERIFICATION",
        },
      });
    } catch (error) {
      skipped += 1;
      console.error(
        `[Opportunity feed] Could not normalize entry from ${source.key}:`,
        error,
      );
    }
  }

  return { items, skipped };
}

async function readBoundedBody(
  response: Response,
  maximumBytes: number,
): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));

  if (
    Number.isFinite(contentLength) &&
    contentLength > maximumBytes
  ) {
    throw new Error("Feed response exceeds the allowed size.");
  }

  if (!response.body) {
    throw new Error("Feed response has no readable body.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    totalBytes += value.byteLength;

    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new Error("Feed response exceeds the allowed size.");
    }

    chunks.push(value);
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8").decode(merged);
}

const GOVUK_CONTENT_CONCURRENCY = 4;

async function fetchGovUkContentDocument(sourceUrl: string): Promise<unknown> {
  const endpoint = getGovUkContentApiUrl(sourceUrl);

  const response = await fetchWithRetry(
    endpoint,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Keren Opportunity Discovery/1.0",
      },
      cache: "no-store",
    },
    "GOV.UK Content API",
  );

  if (!response.ok) {
    throw new Error(`GOV.UK Content API failed with HTTP ${response.status}.`);
  }

  const body = await readBoundedBody(response, MAX_FEED_BYTES);

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error("GOV.UK Content API returned invalid JSON.");
  }
}

async function enrichGovUkFeedItems(
  items: NormalizedOpportunitySourceItem[],
): Promise<{
  items: NormalizedOpportunitySourceItem[];
  skipped: number;
  failed: number;
}> {
  const results: Array<NormalizedOpportunitySourceItem | null> =
    new Array(items.length).fill(null);

  let nextIndex = 0;
  let skipped = 0;
  let failed = 0;

  const workerCount = Math.min(GOVUK_CONTENT_CONCURRENCY, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;

        const item = items[index];

        try {
          const document = await fetchGovUkContentDocument(item.sourceUrl);
          const enriched = enrichGovUkFeedItem(item, document);

          if (enriched) {
            results[index] = enriched;
          } else {
            skipped += 1;
          }
        } catch (error) {
          failed += 1;
          console.error(
            `[Opportunity feed] GOV.UK validation failed for ${item.sourceUrl}:`,
            error,
          );
        }
      }
    }),
  );

  return {
    items: results.filter(
      (item): item is NormalizedOpportunitySourceItem => item !== null,
    ),
    skipped,
    failed,
  };
}

export async function importFeedOpportunities(
  adminUserId: string,
  sourceKey: string,
): Promise<OpportunitySourceImportResult> {
  const source = getOpportunitySourceDefinition(sourceKey);

  if (!source) {
    throw new Error(`No source is registered for ${sourceKey}.`);
  }

  const feedMethod = source.method;

  if (feedMethod !== "RSS" && feedMethod !== "ATOM") {
    throw new Error(`Source ${sourceKey} is not an RSS/Atom connector.`);
  }

  return runOpportunitySourceImport({
    source,
    adminUserId,
    fetchItems: async () => {
      const response = await fetchWithRetry(
        source.feedUrl?.trim() || source.listingUrl,
        {
          method: "GET",
          headers: {
            Accept:
              "application/atom+xml, application/rss+xml, application/xml, text/xml",
            "User-Agent": "Keren Opportunity Discovery/1.0",
          },
          cache: "no-store",
        },
        `${source.name} feed`,
      );

      if (!response.ok) {
        throw new Error(
          `${source.name} feed failed with HTTP ${response.status}.`,
        );
      }

      const xml = await readBoundedBody(response, MAX_FEED_BYTES);
      const allEntries = parseFeedEntries(xml, feedMethod);

      const batch = allEntries.slice(0, MAX_FEED_ITEMS);
      const normalized = normalizeFeedEntries(batch, source);

      if (source.key === "fcdo-international-development-funding") {
        const validated = await enrichGovUkFeedItems(normalized.items);

        return {
          items: validated.items,
          scanned: batch.length,
          skipped: normalized.skipped + validated.skipped,
          failed: validated.failed,
          totalAvailable: allEntries.length,
        };
      }

      return {
        items: normalized.items,
        scanned: batch.length,
        skipped: normalized.skipped,
        totalAvailable: allEntries.length,
      };
    },
  });
}
