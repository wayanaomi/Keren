import { describe, expect, it } from "vitest";
import {
  computeMatch,
  type MatchOpportunityInput,
  type MatchOrgInput,
} from "./engine";

const organization: MatchOrgInput = {
  country: "Nigeria",
  industry: "Fintech",
  businessStage: "SEED",
  type: "STARTUP",
  annualTurnover: 80000,
  fundingRequired: 40000,
  employeeCount: 8,
  foundedYear: 2023,
};

const opportunity: MatchOpportunityInput = {
  country: null,
  eligibleCountries: [],
  sector: null,
  industry: null,
  businessStages: [],
  applicantTypes: [],
  minFunding: null,
  maxFunding: null,
  minRevenue: null,
  minEmployees: 10,
  eligibilityRequirements: [],
};

describe("employee qualification checks", () => {
  it("flags an organization below the minimum without changing its score", () => {
    const result = computeMatch(organization, opportunity);

    expect(result.score).toBe(100);
    expect(result.potentialBlockers).toContain(
      "This opportunity requires at least 10 employees; your organization has 8.",
    );
    expect(result.breakdown.some((item) => item.label === "Employee count")).toBe(false);
  });

  it("flags missing employee information without reducing the score", () => {
    const result = computeMatch(
      { ...organization, employeeCount: null },
      opportunity,
    );

    expect(result.score).toBe(100);
    expect(result.missingInformation).toContain(
      "This opportunity requires at least 10 employees; your employee count is not set.",
    );
  });

  it("recognizes an organization meeting the employee requirement", () => {
    const result = computeMatch(
      { ...organization, employeeCount: 12 },
      opportunity,
    );

    expect(result.score).toBe(100);
    expect(result.qualificationChecks[0].status).toBe("met");
    expect(result.potentialBlockers).toHaveLength(0);
  });

  it("does not create an employee blocker when no minimum is specified", () => {
    const result = computeMatch(organization, {
      ...opportunity,
      minEmployees: null,
    });

    expect(result.score).toBe(100);
    expect(result.qualificationChecks[0].status).toBe("not-applicable");
  });

  it("uses exactly the PRD's 100 scoring points", () => {
    const result = computeMatch(organization, opportunity);

    expect(
      result.breakdown.reduce((total, criterion) => total + criterion.maxPoints, 0),
    ).toBe(100);
  });
});
