import { describe, expect, it } from "vitest";
import type { NormalizedOpportunitySourceItem } from "./types";
import {
  enrichGovUkFeedItem,
  getGovUkContentApiUrl,
} from "./govuk";

function candidate(): NormalizedOpportunitySourceItem {
  return {
    externalId: "programme-123",
    sourceUrl:
      "https://www.gov.uk/international-development-funding/example-programme",
    canonicalUrl:
      "https://www.gov.uk/international-development-funding/example-programme",
    title: "Example programme",
    sourceStatus: "PUBLISHED_IN_FEED",
    opportunity: {
      title: "Example programme",
      funder: "Foreign, Commonwealth & Development Office",
      type: "OTHER",
      description: "Feed summary.",
      deadline: null,
      openingDate: null,
      sourceUrl:
        "https://www.gov.uk/international-development-funding/example-programme",
      sourceName: "FCDO",
      eligibilityRequirements: [],
      requiredDocuments: [],
      keywords: [],
      status: "DRAFT",
      verificationStatus: "NEEDS_VERIFICATION",
    },
  } as NormalizedOpportunitySourceItem;
}

function page(overrides: Record<string, unknown> = {}) {
  return {
    base_path: "/international-development-funding/example-programme",
    title: "Official programme title",
    document_type: "international_development_fund",
    first_published_at: "2026-01-01T00:00:00.000Z",
    public_updated_at: "2026-10-01T00:00:00.000Z",
    withdrawn_notice: {},
    details: {
      metadata: { fund_state: "open" },
      body: [
        {
          content:
            "<p>Applications close on 11 December 2026.</p>" +
            "<p>Full proposal deadline: 22 January 2027.</p>",
        },
      ],
    },
    ...overrides,
  };
}

describe("GOV.UK Content API validation", () => {
  it("builds a content API URL from an approved FCDO page", () => {
    expect(
      getGovUkContentApiUrl(
        "https://www.gov.uk/international-development-funding/example-programme?utm_source=feed",
      ),
    ).toBe(
      "https://www.gov.uk/api/content/international-development-funding/example-programme",
    );
  });

  it("rejects URLs outside the approved GOV.UK funding collection", () => {
    expect(() =>
      getGovUkContentApiUrl("https://example.com/international-development-funding/test"),
    ).toThrow();

    expect(() =>
      getGovUkContentApiUrl("https://www.gov.uk/government/news/example"),
    ).toThrow();
  });

  it("accepts an empty withdrawn notice and uses explicit official deadlines", () => {
    const result = enrichGovUkFeedItem(candidate(), page());

    expect(result).not.toBeNull();
    expect(result?.title).toBe("Official programme title");
    expect(result?.sourceStatus).toBe("OPEN");
    expect(result?.opportunity.deadline instanceof Date
        ? result.opportunity.deadline.toISOString()
        : new Date(String(result?.opportunity.deadline)).toISOString()).toBe(
      "2027-01-22T23:59:59.999Z",
    );
    expect(result?.sourceUpdatedAt?.toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });

  it("does not invent a deadline from the page update date", () => {
    const result = enrichGovUkFeedItem(
      candidate(),
      page({
        details: {
          metadata: { fund_state: "open" },
          body: [{ content: "<p>Read the programme guidance.</p>" }],
        },
      }),
    );

    expect(result).not.toBeNull();
    expect(result?.opportunity.deadline).toBeNull();
    expect(result?.sourceUpdatedAt?.toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });

  it("excludes notices whose official fund state is not open", () => {
    const result = enrichGovUkFeedItem(
      candidate(),
      page({
        details: {
          metadata: { fund_state: "closed" },
          body: [],
        },
      }),
    );

    expect(result).toBeNull();
  });

  it("excludes notices with a real withdrawal notice", () => {
    const result = enrichGovUkFeedItem(
      candidate(),
      page({ withdrawn_notice: { explanation: "This fund was withdrawn." } }),
    );

    expect(result).toBeNull();
  });

  it("excludes pages explicitly marked as withdrawn", () => {
    const result = enrichGovUkFeedItem(
      candidate(),
      page({ withdrawn: true }),
    );

    expect(result).toBeNull();
  });
});
