import { createHash } from "node:crypto";

const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "referrer",
]);

export function canonicalizeSourceUrl(input: string): string {
  const url = new URL(input.trim());

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Opportunity source URLs must use HTTP or HTTPS.");
  }

  url.hash = "";

  for (const key of Array.from(url.searchParams.keys())) {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey.startsWith("utm_") ||
      TRACKING_PARAMETERS.has(normalizedKey)
    ) {
      url.searchParams.delete(key);
    }
  }

  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";

  return url.toString();
}

export function createOpportunityContentHash(
  title: string,
  description: string,
): string {
  const normalized = `${title}\n${description}`
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return createHash("sha256").update(normalized).digest("hex");
}


export interface OpportunityIdentityInput {
  title: string;
  funder: string;
  type: string;
  openingDate?: Date | string | null;
  deadline?: Date | string | null;
  reference?: string | null;
}

function normalizeIdentityText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function identityDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  // Calendar-day precision avoids false mismatches from time-zone offsets.
  return date.toISOString().slice(0, 10);
}

/**
 * Conservative cross-publisher identity.
 *
 * Prefer a source-published reference scoped by publisher and type. Otherwise,
 * require at least one official opening/deadline date and hash the normalized
 * title + publisher + type + dates. With no reference or date, return null and
 * let canonical URL / same-source external ID do the deduplication. This avoids
 * merging unrelated calls merely because they share a generic title.
 */
export function createOpportunityIdentityHash(
  input: OpportunityIdentityInput,
): string | null {
  const title = normalizeIdentityText(input.title);
  const funder = normalizeIdentityText(input.funder);
  const type = normalizeIdentityText(input.type);

  if (!title || !funder || !type) return null;

  const reference = input.reference
    ? normalizeIdentityText(input.reference)
    : "";

  if (reference) {
    return createHash("sha256")
      .update(["reference", funder, type, reference].join("|"))
      .digest("hex");
  }

  const openingDate = identityDate(input.openingDate);
  const deadline = identityDate(input.deadline);

  if (!openingDate && !deadline) return null;

  return createHash("sha256")
    .update([
      "dated-notice",
      title,
      funder,
      type,
      openingDate ?? "",
      deadline ?? "",
    ].join("|"))
    .digest("hex");
}
