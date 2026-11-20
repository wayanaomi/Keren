import { describe, expect, it } from "vitest";
import { parseTedDate } from "./ted";

describe("TED procurement dates", () => {
  it("preserves publication dates at the start of the day", () => {
    expect(
      parseTedDate("2027-01-22")?.toISOString(),
    ).toBe("2027-01-22T00:00:00.000Z");
  });

  it("keeps a tender deadline open through its closing day", () => {
    expect(
      parseTedDate("2027-01-22+01:00", true)?.toISOString(),
    ).toBe("2027-01-22T23:59:59.999Z");
  });

  it("rejects invalid calendar dates", () => {
    expect(parseTedDate("2027-02-29", true)).toBeNull();
  });
});
