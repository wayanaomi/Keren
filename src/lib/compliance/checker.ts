import type { Organization } from "@prisma/client";

/**
 * Compliance Checker — deterministic, like the matching engine. Completion is counted
 * from actual records; conflicts are detected with simple, explainable numeric checks
 * rather than an LLM guessing at consistency.
 */

export interface ComplianceAnswerInput {
  questionText: string;
  finalAnswer: string | null;
  draftAnswer: string | null;
}

export interface ComplianceRequirementInput {
  label: string;
  isSatisfied: boolean;
}

export interface ComplianceResult {
  completionPercentage: number;
  missingItems: string[];
  conflicts: { field: string; applicationValue: string; profileValue: string }[];
  warnings: string[];
}

export function runComplianceCheck(
  organization: Organization,
  profileCompleteness: number,
  answers: ComplianceAnswerInput[],
  requirements: ComplianceRequirementInput[],
): ComplianceResult {
  const missingItems: string[] = [];
  const warnings: string[] = [];
  const conflicts: ComplianceResult["conflicts"] = [];

  const answeredCount = answers.filter((a) => a.finalAnswer && a.finalAnswer.trim().length > 0).length;
  if (answers.length > 0 && answeredCount < answers.length) {
    missingItems.push(`${answers.length - answeredCount} application question(s) not yet answered.`);
  }

  if (profileCompleteness < 100) {
    missingItems.push("Organization profile is incomplete.");
  }

  const unsatisfiedRequirements = requirements.filter((r) => !r.isSatisfied);
  for (const req of unsatisfiedRequirements) {
    missingItems.push(req.label);
  }

  // Employee-count conflict detection: compare any number near "employee(s)" in an
  // answer against the organization's recorded employee count.
  if (organization.employeeCount != null) {
    for (const answer of answers) {
      const text = answer.finalAnswer ?? answer.draftAnswer ?? "";
      const match = text.match(/(\d+)\s*(full[- ]time\s*)?employees?/i);
      if (match) {
        const stated = Number(match[1]);
        if (stated !== organization.employeeCount) {
          conflicts.push({
            field: "Employee count",
            applicationValue: `${stated}`,
            profileValue: `${organization.employeeCount}`,
          });
        }
      }
    }
  }

  if (answers.length === 0) {
    warnings.push("No application questions have been added yet.");
  }

  const totalChecks = answers.length + 1 /* profile */ + requirements.length;
  const satisfiedChecks =
    answeredCount + (profileCompleteness === 100 ? 1 : 0) + requirements.filter((r) => r.isSatisfied).length;
  const completionPercentage = totalChecks === 0 ? 0 : Math.round((satisfiedChecks / totalChecks) * 100);

  return { completionPercentage, missingItems, conflicts, warnings };
}
