import type { Organization } from "@prisma/client";
import {
  isUsableAnswer,
  normalizeQuestionText,
} from "../applications/answer-utils";

/**
 * Compliance Checker — deterministic and explainable.
 * Duplicate legacy answer records count as one application question.
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

  // Prefer a duplicate record that has a genuine final answer, then a useful
  // draft. This prevents an empty legacy row from hiding a completed answer.
  const canonicalAnswers = new Map<string, ComplianceAnswerInput>();

  const answerQuality = (answer: ComplianceAnswerInput) =>
    (isUsableAnswer(answer.finalAnswer) ? 100 : 0) +
    (isUsableAnswer(answer.draftAnswer) ? 10 : 0);

  for (const answer of answers) {
    const key = normalizeQuestionText(answer.questionText);
    const current = canonicalAnswers.get(key);

    if (!current || answerQuality(answer) > answerQuality(current)) {
      canonicalAnswers.set(key, answer);
    }
  }

  const uniqueAnswers = Array.from(canonicalAnswers.values());
  const answeredCount = uniqueAnswers.filter((answer) =>
    isUsableAnswer(answer.finalAnswer)
  ).length;

  if (uniqueAnswers.length > 0 && answeredCount < uniqueAnswers.length) {
    missingItems.push(
      `${uniqueAnswers.length - answeredCount} application question(s) not yet answered.`
    );
  }

  if (profileCompleteness < 100) {
    missingItems.push("Organization profile is incomplete.");
  }

  const unsatisfiedRequirements = requirements.filter((requirement) => !requirement.isSatisfied);

  for (const requirement of unsatisfiedRequirements) {
    missingItems.push(requirement.label);
  }

  // Employee-count conflict detection uses one canonical answer per question.
  if (organization.employeeCount != null) {
    for (const answer of uniqueAnswers) {
      const text = isUsableAnswer(answer.finalAnswer)
        ? answer.finalAnswer
        : isUsableAnswer(answer.draftAnswer)
          ? answer.draftAnswer
          : "";

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

  if (uniqueAnswers.length === 0) {
    warnings.push("No application questions have been added yet.");
  }

  const totalChecks = uniqueAnswers.length + 1 + requirements.length;
  const satisfiedChecks =
    answeredCount +
    (profileCompleteness === 100 ? 1 : 0) +
    requirements.filter((requirement) => requirement.isSatisfied).length;

  const completionPercentage = Math.round((satisfiedChecks / totalChecks) * 100);

  return { completionPercentage, missingItems, conflicts, warnings };
}
