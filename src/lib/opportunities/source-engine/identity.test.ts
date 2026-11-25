import { describe, expect, it } from "vitest";
import {
  canonicalizeSourceUrl,
  createOpportunityContentHash,
  createOpportunityIdentityHash,
} from "./identity";

describe("canonicalizeSourceUrl", () => {
  it("removes tracking parameters and fragments", () => {
    expect(
      canonicalizeSourceUrl(
        "https://EXAMPLE.org/opportunity/?utm_source=newsletter&ref=mail&id=42#details",
      ),
    ).toBe("https://example.org/opportunity?id=42");
  });

  it("sorts remaining query parameters", () => {
    expect(
      canonicalizeSourceUrl("https://example.org/list?z=2&a=1"),
    ).toBe("https://example.org/list?a=1&z=2");
  });

  it("rejects non-HTTP URLs", () => {
    expect(() => canonicalizeSourceUrl("javascript:alert(1)")).toThrow();
  });
});

describe("createOpportunityContentHash", () => {
  it("normalizes case and whitespace", () => {
    expect(
      createOpportunityContentHash("  Business Grant ", "Apply   today"),
    ).toBe(
      createOpportunityContentHash("business grant", "apply today"),
    );
  });

  it("changes when the content changes", () => {
    expect(
      createOpportunityContentHash("Business Grant", "Apply today"),
    ).not.toBe(
      createOpportunityContentHash("Business Grant", "Apply tomorrow"),
    );
  });
});


describe("createOpportunityIdentityHash", () => {
  it("matches the same dated notice across source URLs", () => {
    const first = createOpportunityIdentityHash({
      title: "  Rural Roads Rehabilitation ",
      funder: "NDDC",
      type: "TENDER",
      openingDate: "2026-11-14T00:00:00.000Z",
      deadline: "2026-12-12T23:59:59.999Z",
    });
    const second = createOpportunityIdentityHash({
      title: "rural roads rehabilitation",
      funder: "NDDC",
      type: "TENDER",
      openingDate: "2026-11-14T08:00:00.000Z",
      deadline: "2026-12-12T12:00:00.000Z",
    });

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it("uses a publisher-scoped official reference when available", () => {
    expect(createOpportunityIdentityHash({
      title: "Media Monitoring Procurement",
      funder: "African Development Bank",
      type: "RFP",
      reference: "ADB/RFP/TCGS/2026/0243",
    })).toBe(createOpportunityIdentityHash({
      title: "Different translated notice title",
      funder: "African Development Bank",
      type: "RFP",
      reference: "ADB/RFP/TCGS/2026/0243",
    }));
  });

  it("does not fingerprint undated notices without a reference", () => {
    expect(createOpportunityIdentityHash({
      title: "General business support",
      funder: "Some Foundation",
      type: "GRANT",
    })).toBeNull();
  });

  it("does not merge notices with different deadlines", () => {
    expect(createOpportunityIdentityHash({
      title: "Small Business Grant",
      funder: "Example Foundation",
      type: "GRANT",
      deadline: "2026-12-01",
    })).not.toBe(createOpportunityIdentityHash({
      title: "Small Business Grant",
      funder: "Example Foundation",
      type: "GRANT",
      deadline: "2027-01-01",
    }));
  });
});
