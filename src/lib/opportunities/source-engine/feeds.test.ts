import { describe, expect, it } from "vitest";
import {
  normalizeFeedEntries,
  parseFeedEntries,
} from "./feeds";
import type { OpportunitySourceDefinition } from "./types";

const afdbSource: OpportunitySourceDefinition = {
  key: "afdb-project-procurement",
  name: "African Development Bank — Project Procurement",
  organization: "African Development Bank Group",
  category: "Development project procurement",
  method: "RSS",
  opportunityType: "TENDER",
  websiteUrl: "https://www.afdb.org/",
  listingUrl: "https://www.afdb.org/en/projects-and-operations/procurement.xml",
};

const fcdoSource: OpportunitySourceDefinition = {
  key: "fcdo-international-development-funding",
  name: "FCDO — International Development Funding",
  organization: "Foreign, Commonwealth & Development Office",
  category: "International development funding",
  method: "ATOM",
  opportunityType: "OTHER",
  websiteUrl: "https://www.gov.uk/",
  listingUrl: "https://www.gov.uk/international-development-funding.atom",
};

describe("parseFeedEntries", () => {
  it("parses RSS item entries", () => {
    const xml = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Procurement notices</title>
          <item>
            <title>Water infrastructure procurement</title>
            <link>https://example.org/notices/123</link>
            <guid>notice-123</guid>
            <description><![CDATA[<p>Water project notice.</p>]]></description>
            <pubDate>Wed, 18 Nov 2026 10:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>`;

    const entries = parseFeedEntries(xml, "RSS");

    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("Water infrastructure procurement");
    expect(entries[0].guid).toBe("notice-123");
  });

  it("parses Atom entries with href attributes", () => {
    const xml = `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Development funding</title>
        <entry>
          <id>tag:gov.uk,2026:fund-123</id>
          <title>Local development partnership</title>
          <link rel="alternate" href="https://example.org/funds/123"/>
          <summary>Funding call for local partnerships.</summary>
          <updated>2026-11-18T10:00:00Z</updated>
        </entry>
      </feed>`;

    const entries = parseFeedEntries(xml, "ATOM");

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("tag:gov.uk,2026:fund-123");
  });

  it("rejects documents containing a DOCTYPE declaration", () => {
    const xml = `<!DOCTYPE rss [<!ENTITY x "unsafe">]>
      <rss><channel><item><title>&x;</title></item></channel></rss>`;

    expect(() => parseFeedEntries(xml, "RSS")).toThrow("DOCTYPE");
  });

  it("rejects malformed XML", () => {
    expect(() => parseFeedEntries("<rss><channel></rss>", "RSS")).toThrow();
  });
});

describe("normalizeFeedEntries", () => {
  it("normalizes an RSS entry as an unverified tender draft", () => {
    const xml = `<rss><channel><item>
      <title>Water infrastructure procurement</title>
      <link>https://example.org/notices/123?utm_source=feed</link>
      <guid>notice-123</guid>
      <description><![CDATA[<p>Water project notice.</p>]]></description>
      <pubDate>Wed, 18 Nov 2026 10:00:00 GMT</pubDate>
    </item></channel></rss>`;

    const entries = parseFeedEntries(xml, "RSS");
    const result = normalizeFeedEntries(entries, afdbSource);

    expect(result.skipped).toBe(0);
    expect(result.items).toHaveLength(1);

    expect(result.items[0]).toMatchObject({
      externalId: "notice-123",
      sourceUrl: "https://example.org/notices/123?utm_source=feed",
      canonicalUrl: "https://example.org/notices/123",
      title: "Water infrastructure procurement",
      sourceStatus: "PUBLISHED_IN_FEED",
    });

    expect(result.items[0].opportunity).toMatchObject({
      type: "TENDER",
      status: "DRAFT",
      verificationStatus: "NEEDS_VERIFICATION",
      deadline: null,
      eligibleCountries: [],
      applicationUrl: null,
    });

    const importedItem = result.items[0];
    expect(importedItem).toBeDefined();

    if (!importedItem) {
      throw new Error("Expected one normalized feed item.");
    }

    const eligibilityRequirements =
      importedItem.opportunity.eligibilityRequirements as string[];

    expect(eligibilityRequirements.join(" ")).toContain(
      "has not been confirmed",
    );
  });

  it("does not interpret an Atom publication date as a deadline", () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>tag:gov.uk,2026:fund-123</id>
        <title>Local development partnership</title>
        <link rel="alternate" href="https://example.org/funds/123"/>
        <summary>Funding call for local partnerships.</summary>
        <updated>2026-11-18T10:00:00Z</updated>
      </entry>
    </feed>`;

    const entries = parseFeedEntries(xml, "ATOM");
    const result = normalizeFeedEntries(entries, fcdoSource);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].opportunity.type).toBe("OTHER");
    expect(result.items[0].opportunity.deadline).toBeNull();
    expect(result.items[0].sourceUpdatedAt).toEqual(
      new Date("2026-11-18T10:00:00Z"),
    );
  });

  it("skips entries with missing titles or usable links", () => {
    const xml = `<rss><channel>
      <item><title>No link</title><guid>no-link</guid></item>
      <item><link>https://example.org/123</link><guid>no-title</guid></item>
    </channel></rss>`;

    const entries = parseFeedEntries(xml, "RSS");
    const result = normalizeFeedEntries(entries, afdbSource);

    expect(result.items).toHaveLength(0);
    expect(result.skipped).toBe(2);
  });
});
