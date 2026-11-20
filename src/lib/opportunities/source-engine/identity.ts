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
