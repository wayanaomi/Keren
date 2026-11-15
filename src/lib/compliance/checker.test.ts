import { describe, expect, it } from "vitest";
import type { Organization } from "@prisma/client";
import { runComplianceCheck } from "./checker";
import { LEGACY_GENERATION_FAILURE_MESSAGE } from "../applications/answer-utils";

const organization = { employeeCount: null } as unknown as Organization;

describe("runComplianceCheck", () => {
  it("counts duplicate legacy and linked rows as one question", () => {
    const result = runComplianceCheck(
      organization,
      100,
      [
        {
          questionText: "Describe your organisation.",
          finalAnswer: null,
          draftAnswer: null,
        },
        {
          questionText: "  Describe   your organisation. ",
          finalAnswer: "Our organisation works in technology.",
          draftAnswer: "Our organisation works in technology.",
        },
        {
          questionText: "Explain your expected outcomes.",
          finalAnswer: null,
          draftAnswer: "Some draft text.",
        },
      ],
      [],
    );

    expect(result.missingItems).toContain(
      "1 application question(s) not yet answered.",
    );
    expect(result.completionPercentage).toBe(67);
  });

  it("does not treat the old generation failure message as a completed answer", () => {
    const result = runComplianceCheck(
      organization,
      100,
      [
        {
          questionText: "Describe your proposed project.",
          finalAnswer: LEGACY_GENERATION_FAILURE_MESSAGE,
          draftAnswer: "A genuine generated draft.",
        },
      ],
      [],
    );

    expect(result.missingItems).toContain(
      "1 application question(s) not yet answered.",
    );
    expect(result.completionPercentage).toBe(50);
  });
});
