import { describe, expect, it } from "vitest";
import { parseGrantsGovDeadline } from "./grants-gov";

describe("Grants.gov closing dates", () => {
  it("keeps an ISO date open until the end of its closing day", () => {
    expect(
      parseGrantsGovDeadline("2027-01-22")?.toISOString(),
    ).toBe("2027-01-22T23:59:59.999Z");
  });

  it("supports the Grants.gov timestamp-style date format", () => {
    expect(
      parseGrantsGovDeadline("2027-01-22-00-00-00")?.toISOString(),
    ).toBe("2027-01-22T23:59:59.999Z");
  });

  it("supports US-formatted closing dates", () => {
    expect(
      parseGrantsGovDeadline("01/22/2027")?.toISOString(),
    ).toBe("2027-01-22T23:59:59.999Z");
  });

  it("preserves explicit times supplied by the API", () => {
    expect(
      parseGrantsGovDeadline("2027-01-22T14:30:00.000Z")?.toISOString(),
    ).toBe("2027-01-22T14:30:00.000Z");
  });

  it("rejects invalid calendar dates", () => {
    expect(parseGrantsGovDeadline("2027-02-29")).toBeNull();
  });
});
