import type { NormalizedOpportunitySourceItem } from "./types";

type JsonRecord = Record<string, unknown>;

const GOVUK_ORIGIN = "https://www.gov.uk";
const MONTH_PATTERN =
  "(?:January|February|March|April|May|June|July|August|September|October|November|December)";

const DATE_PATTERN =
  `(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH_PATTERN}\\s+\\d{4}|${MONTH_PATTERN}\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4})`;

function asRecord(value: unknown): JsonRecord {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function normalizedPath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

export function getGovUkContentApiUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);

  if (
    url.protocol !== "https:" ||
    url.hostname !== "www.gov.uk" ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error("FCDO source URL is not an approved GOV.UK HTTPS page.");
  }

  const path = normalizedPath(url.pathname);

  if (!/^\/international-development-funding(?:\/|$)/.test(path)) {
    throw new Error("GOV.UK page is outside the FCDO funding collection.");
  }

  return `${GOVUK_ORIGIN}/api/content${path}`;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;

  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;

  if (typeof value === "object") {
    return Object.keys(value as JsonRecord).length > 0;
  }

  return true;
}

function htmlToText(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function collectBodyText(value: unknown, output: string[], depth = 0): void {
  if (depth > 20 || value === null || value === undefined) return;

  if (typeof value === "string") {
    const text = htmlToText(value);
    if (text) output.push(text);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectBodyText(item, output, depth + 1);
    return;
  }

  if (typeof value !== "object") return;

  const record = asRecord(value);

  for (const key of ["content", "text", "children", "items", "blocks"]) {
    if (key in record) {
      collectBodyText(record[key], output, depth + 1);
    }
  }
}

function parseClosingDate(value: string): Date | null {
  const cleaned = value
    .replace(/(\d)(?:st|nd|rd|th)\b/gi, "$1")
    .replace(/,/g, "")
    .trim();

  let year: number;
  let month: number;
  let day: number;

  const iso = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    const months: Record<string, number> = {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12,
    };

    const dayFirst = cleaned.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
    const monthFirst = cleaned.match(/^([a-z]+)\s+(\d{1,2})\s+(\d{4})$/i);

    if (dayFirst) {
      day = Number(dayFirst[1]);
      month = months[dayFirst[2].toLowerCase()] ?? 0;
      year = Number(dayFirst[3]);
    } else if (monthFirst) {
      month = months[monthFirst[1].toLowerCase()] ?? 0;
      day = Number(monthFirst[2]);
      year = Number(monthFirst[3]);
    } else {
      return null;
    }
  }

  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function extractExplicitDeadlines(
  bodyText: string,
): Array<{ date: Date; evidence: string }> {
  const marker = new RegExp(
    String.raw`\b(?:deadline|closing\s+date|closes|applications?\s+close(?:s)?|last\s+date\s+for\s+applications|applications?\s+(?:must\s+be\s+received|must\s+be\s+submitted)\s+by|apply\s+by|submit(?:ted)?\s+by)\b[^\n.;]{0,140}?(${DATE_PATTERN})`,
    "gi",
  );

  const matches: Array<{ date: Date; evidence: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = marker.exec(bodyText)) !== null) {
    const date = parseClosingDate(match[1]);

    if (date) {
      matches.push({
        date,
        evidence: match[0].trim().slice(0, 240),
      });
    }
  }

  return matches;
}

function parseApiDate(value: unknown): Date | null {
  const text = stringValue(value);
  if (!text) return null;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function enrichGovUkFeedItem(
  item: NormalizedOpportunitySourceItem,
  rawDocument: unknown,
): NormalizedOpportunitySourceItem | null {
  const document = asRecord(rawDocument);
  const details = asRecord(document.details);
  const metadata = asRecord(details.metadata);

  const expectedPath = normalizedPath(new URL(item.sourceUrl).pathname);
  const basePath = stringValue(document.base_path);

  if (!basePath || normalizedPath(basePath) !== expectedPath) {
    throw new Error("GOV.UK Content API page path did not match the feed notice.");
  }

  if (document.withdrawn === true || hasMeaningfulValue(document.withdrawn_notice)) {
    return null;
  }

  const fundState = stringValue(metadata.fund_state)?.toLowerCase();

  if (fundState !== "open") {
    return null;
  }

  const title = stringValue(document.title) ?? item.title;
  const bodyParts: string[] = [];
  collectBodyText(details.body, bodyParts);

  const bodyText = bodyParts.join("\n\n").slice(0, 12_000);
  const deadlineEvidence = extractExplicitDeadlines(bodyText);

  const finalDeadline = deadlineEvidence.length
    ? deadlineEvidence.reduce((latest, current) =>
        current.date.getTime() > latest.date.getTime() ? current : latest,
      ).date
    : null;

  const firstPublishedAt = parseApiDate(document.first_published_at);
  const publicUpdatedAt = parseApiDate(document.public_updated_at);

  const description = [
    bodyText || item.opportunity.description ||
      "The official GOV.UK page did not supply a readable description.",
    "",
    "Checked against the official GOV.UK Content API.",
    "Confirm applicant eligibility and submission instructions before publication.",
  ].join("\n");

  return {
    ...item,
    title,
    sourceStatus: "OPEN",
    sourcePublishedAt: firstPublishedAt ?? item.sourcePublishedAt,
    sourceUpdatedAt: publicUpdatedAt ?? item.sourceUpdatedAt,
    metadata: {
      feedMethod: "ATOM",
      feedEntryId: item.externalId,
      govUkContentApi: {
        basePath,
        documentType: stringValue(document.document_type),
        fundState,
        withdrawn: false,
        withdrawnNoticePresent: false,
        firstPublishedAt: firstPublishedAt?.toISOString() ?? null,
        publicUpdatedAt: publicUpdatedAt?.toISOString() ?? null,
        deadlineEvidence: deadlineEvidence.map((entry) => ({
          deadline: entry.date.toISOString(),
          evidence: entry.evidence,
        })),
      },
    },
    opportunity: {
      ...item.opportunity,
      title,
      description,
      openingDate: firstPublishedAt ?? item.opportunity.openingDate,
      deadline: finalDeadline,
      sourceUrl: item.sourceUrl,
    },
  };
}
