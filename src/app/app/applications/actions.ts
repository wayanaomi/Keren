"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrganization } from "@/lib/auth/session";
import { generateApplicationDraft } from "@/lib/ai/writer/generateDraft";
import { buildOrganizationFacts } from "@/lib/organization/context";
import { runComplianceCheck } from "@/lib/compliance/checker";
import { computeProfileCompleteness } from "@/lib/organization/context";
import type { ApplicationStatus } from "@prisma/client";

export async function updateApplicationStatusAction(applicationId: string, status: ApplicationStatus) {
  const { organization } = await requireOrganization();
  await db.application.updateMany({
    where: { id: applicationId, organizationId: organization.id },
    data: { status, submittedAt: status === "SUBMITTED" ? new Date() : undefined },
  });
  revalidatePath("/app/applications");
  revalidatePath(`/app/applications/${applicationId}`);
}

export async function generateDraftAction(answerId: string, instruction?: string) {
  const { organization } = await requireOrganization();

  const answer = await db.applicationAnswer.findFirst({
    where: { id: answerId, application: { organizationId: organization.id } },
    include: { application: { include: { opportunity: true } } },
  });
  if (!answer) throw new Error("Answer not found");

  const [founders, documents] = await Promise.all([
    db.founder.findMany({ where: { organizationId: organization.id } }),
    db.knowledgeDocument.findMany({
      where: { organizationId: organization.id },
      select: { name: true, type: true, extractedSummary: true },
    }),
  ]);

  const organizationFacts = buildOrganizationFacts(organization, founders, documents);
  const opp = answer.application.opportunity;

  const result = await generateApplicationDraft({
    organizationId: organization.id,
    organizationFacts,
    opportunityTitle: opp.title,
    opportunityFacts: {
      description: opp.description,
      fundingAmount: opp.fundingAmount,
      eligibilityRequirements: opp.eligibilityRequirements,
      deadline: opp.deadline,
    },
    question: answer.questionText,
    instruction,
    previousAnswer: answer.draftAnswer ?? undefined,
  });

  await db.applicationAnswer.update({
    where: { id: answerId },
    data: {
      draftAnswer: result.draftAnswer,
      sourceInformation: result.sourceInformation,
      missingInformation: result.missingInformation,
      aiGenerated: true,
    },
  });

  revalidatePath(`/app/applications/${answer.applicationId}`);
}

export async function saveFinalAnswerAction(answerId: string, finalAnswer: string) {
  const { organization } = await requireOrganization();
  const answer = await db.applicationAnswer.findFirst({
    where: { id: answerId, application: { organizationId: organization.id } },
  });
  if (!answer) throw new Error("Answer not found");

  await db.applicationAnswer.update({ where: { id: answerId }, data: { finalAnswer } });
  revalidatePath(`/app/applications/${answer.applicationId}`);
}

export async function toggleRequirementAction(requirementId: string) {
  const { organization } = await requireOrganization();
  const requirement = await db.applicationRequirement.findFirst({
    where: { id: requirementId, application: { organizationId: organization.id } },
  });
  if (!requirement) throw new Error("Requirement not found");

  await db.applicationRequirement.update({
    where: { id: requirementId },
    data: { isSatisfied: !requirement.isSatisfied },
  });
  revalidatePath(`/app/applications/${requirement.applicationId}`);
}

export async function runComplianceCheckAction(applicationId: string) {
  const { organization } = await requireOrganization();

  const application = await db.application.findFirst({
    where: { id: applicationId, organizationId: organization.id },
    include: { answers: true, requirements: true },
  });
  if (!application) throw new Error("Application not found");

  const completeness = computeProfileCompleteness(organization);
  const result = runComplianceCheck(organization, completeness, application.answers, application.requirements);

  await db.complianceCheck.create({
    data: {
      applicationId,
      completionPercentage: result.completionPercentage,
      missingItems: result.missingItems,
      conflicts: result.conflicts,
      warnings: result.warnings,
    },
  });

  revalidatePath(`/app/applications/${applicationId}`);
}
