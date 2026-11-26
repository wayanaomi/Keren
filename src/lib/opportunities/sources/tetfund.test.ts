import { describe, expect, it } from "vitest";
import { OPPORTUNITY_SOURCE_REGISTRY } from "../source-engine/registry";
import { parseTETFundNewsListing } from "./tetfund";

const source = OPPORTUNITY_SOURCE_REGISTRY.find(
  (item) => item.key === "tetfund-opportunities",
)!;

describe("parseTETFundNewsListing", () => {
  it("imports a recent official procurement notice as a draft tender", () => {
    const html = `
      <html><body>
        <article class="news-card">
          <a href="/news/details/81">SPECIFIC PROCUREMENT NOTICE FOR YEAR 2026 PROJECTS</a>
          <span class="date">Nov 12, 2026</span>
        </article>
      </body></html>`;

    const result = parseTETFundNewsListing(
      html,
      source,
      new Date("2026-11-25T12:00:00.000Z"),
    );

    expect(result.scanned).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      externalId: "tetfund-news-81",
      sourceUrl: "https://www.tetfund.gov.ng/news/details/81",
      title: "SPECIFIC PROCUREMENT NOTICE FOR YEAR 2026 PROJECTS",
      sourceStatus: "PUBLISHED_ON_OFFICIAL_LISTING",
    });
    expect(result.items[0].opportunity).toMatchObject({
      type: "TENDER",
      status: "DRAFT",
      verificationStatus: "NEEDS_VERIFICATION",
      deadline: null,
      fundingAmount: null,
      eligibleCountries: [],
      applicationUrl: null,
    });
  });

  it("excludes ordinary news even when published recently", () => {
    const html = `
      <article>
        <a href="/news/details/82">TETFund Commissions New ICT Building</a>
        <span>Nov 12, 2026</span>
      </article>`;

    const result = parseTETFundNewsListing(
      html,
      source,
      new Date("2026-11-25T12:00:00.000Z"),
    );

    expect(result.items).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("excludes stale and undated notices", () => {
    const html = `
      <article>
        <a href="/news/details/83">Call for Proposals: Historical Research Fund</a>
        <span>Feb 27, 2026</span>
      </article>
      <article>
        <a href="/news/details/84">Call for Applications: Undated Research Award</a>
      </article>`;

    const result = parseTETFundNewsListing(
      html,
      source,
      new Date("2026-11-25T12:00:00.000Z"),
    );

    expect(result.items).toHaveLength(0);
    expect(result.skipped).toBe(2);
  });

  it("rejects links outside the official TETFund host", () => {
    const html = `
      <article>
        <a href="https://example.org/news/details/85">Invitation to Tender for Research Equipment</a>
        <span>Nov 12, 2026</span>
      </article>`;

    const result = parseTETFundNewsListing(
      html,
      source,
      new Date("2026-11-25T12:00:00.000Z"),
    );

    expect(result.items).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("accepts article links on the official non-www TETFund hostname", () => {
    const html = `
      <article>
        <a href="https://tetfund.gov.ng/news/details/87">
          INVITATION TO TENDER FOR RESEARCH EQUIPMENT
        </a>
        <span>Nov 12, 2026</span>
      </article>`;

    const result = parseTETFundNewsListing(
      html,
      source,
      new Date("2026-11-25T12:00:00.000Z"),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].sourceUrl).toBe(
      "https://tetfund.gov.ng/news/details/87",
    );
    expect(result.items[0].opportunity.status).toBe("DRAFT");
  });

  it("does not classify general programme applications as grants", () => {
    const html = `
      <article>
        <a href="/news/details/88">Call for Applications: Entrepreneurship Development Intervention</a>
        <span>Nov 12, 2026</span>
      </article>`;

    const result = parseTETFundNewsListing(
      html,
      source,
      new Date("2026-11-25T12:00:00.000Z"),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].opportunity.type).toBe("OTHER");
  });

  it("classifies research-funding calls as grants without inventing terms", () => {
    const html = `
      <article>
        <a href="/news/details/86">Call for Proposals: National Research Fund</a>
        <span>Nov 12, 2026</span>
      </article>`;

    const result = parseTETFundNewsListing(
      html,
      source,
      new Date("2026-11-25T12:00:00.000Z"),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].opportunity.type).toBe("GRANT");
    expect(result.items[0].opportunity.deadline).toBeNull();
    expect(result.items[0].opportunity.fundingAmount).toBeNull();
  });
  it("does not borrow a sibling list item's publication date", () => {
    const html = `
      <article>
        <ul>
          <li>
            <a href="/news/details/89">Call for Proposals: National Research Fund</a>
            <span>Nov 12, 2026</span>
          </li>
          <li>
            <a href="/news/details/90">Call for Proposals: Undated Research Award</a>
          </li>
        </ul>
      </article>`;

    const result = parseTETFundNewsListing(
      html,
      source,
      new Date("2026-11-25T12:00:00.000Z"),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].externalId).toBe("tetfund-news-89");
    expect(result.skipped).toBe(1);
  });

});
