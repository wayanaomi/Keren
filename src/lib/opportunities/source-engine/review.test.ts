import { describe, expect, it } from "vitest";
import {
  getImportedOpportunityPublicationError,
  isOfficialEvidenceUrl,
} from "./review";

const officialUrls: string[] = ["https://www.nddc.gov.ng/tenders/123"];
const base = {
  verificationStatus: "VERIFIED" as const,
  eligibilityStatus: "VERIFIED_ELIGIBLE" as const,
  eligibilityEvidenceUrl: "https://www.nddc.gov.ng/tenders/123#eligibility",
  officialUrls,
  deadline: new Date("2026-12-12T23:59:59.999Z"),
  now: new Date("2026-11-21T00:00:00.000Z"),
} as const;

describe("imported opportunity publication review", () => {
  it("requires the official notice to be verified", () => {
    expect(getImportedOpportunityPublicationError({
      ...base,
      verificationStatus: "NEEDS_VERIFICATION",
    })).toMatch(/Verify the official notice/);
  });

  it("requires an explicit verified-eligible decision", () => {
    expect(getImportedOpportunityPublicationError({
      ...base,
      eligibilityStatus: "NEEDS_REVIEW",
    })).toMatch(/Verified eligible/);
    expect(getImportedOpportunityPublicationError({
      ...base,
      eligibilityStatus: "VERIFIED_INELIGIBLE",
    })).toMatch(/Verified eligible/);
  });

  it("requires evidence hosted by the same official publisher", () => {
    expect(isOfficialEvidenceUrl(
      "https://random-example.com/eligibility",
      officialUrls,
    )).toBe(false);
    expect(getImportedOpportunityPublicationError({
      ...base,
      eligibilityEvidenceUrl: "https://random-example.com/eligibility",
    })).toMatch(/same official publisher host/);
  });

  it("accepts an HTTPS subdomain of the official publisher", () => {
    expect(isOfficialEvidenceUrl(
      "https://procurement.nddc.gov.ng/notices/123",
      officialUrls,
    )).toBe(true);
  });

  it("rejects credentials and non-HTTPS evidence URLs", () => {
    expect(isOfficialEvidenceUrl(
      "http://www.nddc.gov.ng/tenders/123",
      officialUrls,
    )).toBe(false);
    expect(isOfficialEvidenceUrl(
      "https://user:password@www.nddc.gov.ng/tenders/123",
      officialUrls,
    )).toBe(false);
  });

  it("blocks a past deadline", () => {
    expect(getImportedOpportunityPublicationError({
      ...base,
      deadline: new Date("2026-11-20T23:59:59.999Z"),
    })).toMatch(/past deadline/);
  });

  it("allows publication after both independent reviews pass", () => {
    expect(getImportedOpportunityPublicationError(base)).toBeNull();
  });
});
