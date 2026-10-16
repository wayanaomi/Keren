import { describe, expect, it } from "vitest";
import { computeMatch, matchFitLabel, type MatchOpportunityInput, type MatchOrgInput } from "./engine";

const baseOrg: MatchOrgInput = {
  country: "Nigeria",
  industry: "Fintech",
  businessStage: "SEED",
  type: "STARTUP",
  annualTurnover: 80_000,
  fundingRequired: 40_000,
  employeeCount: 8,
  foundedYear: 2023,
};

const baseOpp: MatchOpportunityInput = {
  country: null,
  eligibleCountries: ["Nigeria", "Ghana", "Kenya"],
  sector: "Fintech",
  industry: null,
  businessStages: ["SEED", "PRE_SEED"],
  applicantTypes: ["STARTUP"],
  minFunding: 10_000,
  maxFunding: 50_000,
  minRevenue: 50_000,
  minEmployees: null,
  eligibilityRequirements: [],
};

describe("computeMatch", () => {
  it("scores a fully eligible organization at 100", () => {
    const result = computeMatch(baseOrg, baseOpp);
    expect(result.score).toBe(100);
    expect(result.potentialBlockers).toHaveLength(0);
    expect(result.missingInformation).toHaveLength(0);
  });

  it("is deterministic — same inputs always produce the same score", () => {
    const a = computeMatch(baseOrg, baseOpp);
    const b = computeMatch(baseOrg, baseOpp);
    expect(a.score).toBe(b.score);
    expect(a.breakdown).toEqual(b.breakdown);
  });

  it("penalizes ineligible country to 0 on that criterion", () => {
    const result = computeMatch({ ...baseOrg, country: "Brazil" }, baseOpp);
    expect(result.score).toBe(80); // 100 - 20 (country)
    expect(result.potentialBlockers.some((b) => b.includes("eligible countries"))).toBe(true);
  });

  it("flags missing revenue as missing information, not a blocker", () => {
    const result = computeMatch({ ...baseOrg, annualTurnover: null }, baseOpp);
    expect(result.missingInformation.some((m) => m.includes("annual turnover"))).toBe(true);
    expect(result.potentialBlockers).toHaveLength(0);
  });

  it("flags insufficient revenue as a blocker when both values are known", () => {
    const result = computeMatch({ ...baseOrg, annualTurnover: 20_000 }, baseOpp);
    expect(result.potentialBlockers.some((b) => b.includes("Minimum annual revenue"))).toBe(true);
    expect(result.score).toBe(90); // 100 - 10 (revenue)
  });

  it("treats an opportunity with no restrictions as fully open", () => {
    const openOpp: MatchOpportunityInput = {
      country: null,
      eligibleCountries: [],
      sector: null,
      industry: null,
      businessStages: [],
      applicantTypes: [],
      minFunding: null,
      maxFunding: null,
      minRevenue: null,
      minEmployees: null,
      eligibilityRequirements: [],
    };
    const result = computeMatch(
      { country: null, industry: null, businessStage: null, type: "OTHER", annualTurnover: null, fundingRequired: null, employeeCount: null, foundedYear: null },
      openOpp,
    );
    expect(result.score).toBe(100);
  });

  it("checks operating-history eligibility requirements against founded year", () => {
    const opp = { ...baseOpp, eligibilityRequirements: ["Requires 2 years operating history"] };
    const tooNew = computeMatch({ ...baseOrg, foundedYear: new Date().getFullYear() }, opp);
    const established = computeMatch({ ...baseOrg, foundedYear: new Date().getFullYear() - 5 }, opp);
    expect(tooNew.score).toBeLessThan(established.score);
  });

  it("never exceeds 100 or drops below 0", () => {
    const result = computeMatch(baseOrg, baseOpp);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe("matchFitLabel", () => {
  it("maps score ranges to fit labels", () => {
    expect(matchFitLabel(90)).toBe("Strong fit");
    expect(matchFitLabel(60)).toBe("Possible fit");
    expect(matchFitLabel(20)).toBe("Weak fit");
  });
});
