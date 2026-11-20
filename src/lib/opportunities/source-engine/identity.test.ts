import { describe, expect, it } from "vitest";
import {
  canonicalizeSourceUrl,
  createOpportunityContentHash,
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
