"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { opportunitySchema } from "@/lib/validators/opportunity";

type QuestionInput = {
  id: string;
  question: string;
  helpText: string | null;
  maxWords: number | null;
  order: number;
};

function toList(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .split("\\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseOpportunityForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());

  return opportunitySchema.safeParse({
    ...raw,
    eligibleCountries: toList(formData.get("eligibleCountries")).flatMap(
      (v) => v.split(",").map((s) => s.trim()).filter(Boolean)
    ),
    applicantTypes: formData.getAll("applicantTypes"),
    businessStages: formData.getAll("businessStages"),
    eligibilityRequirements: toList(formData.get("eligibilityRequirements")),
    requiredDocuments: toList(formData.get("requiredDocuments")),
    keywords: toList(formData.get("keywords")).flatMap(
      (v) => v.split(",").map((s) => s.trim()).filter(Boolean)
    ),
    fundingAmount: raw.fundingAmount || undefined,
    minFunding: raw.minFunding || undefined,
    maxFunding: raw.maxFunding || undefined,
    minRevenue: raw.minRevenue || undefined,
    minEmployees: raw.minEmployees || undefined,
    openingDate: raw.openingDate || undefined,
    deadline: raw.deadline || undefined,
  });
}

function parseQuestionTemplates(
  formData: FormData
): { questions?: QuestionInput[]; error?: string } {
  const ids = formData.getAll("questionId");
  const texts = formData.getAll("question");
  const helpTexts = formData.getAll("questionHelpText");
  const maxWordValues = formData.getAll("questionMaxWords");

  if (
    ids.length !== texts.length ||
    ids.length !== helpTexts.length ||
    ids.length !== maxWordValues.length
  ) {
    return { error: "Application question fields are incomplete. Please retry." };
  }

  if (texts.length > 100) {
    return { error: "An opportunity cannot contain more than 100 questions." };
  }

  const questions: QuestionInput[] = [];

  for (let index = 0; index < texts.length; index++) {
    const id = ids[index];
    const rawQuestion = texts[index];
    const rawHelp = helpTexts[index];
    const rawMaxWords = maxWordValues[index];

    if (
      typeof id !== "string" ||
      typeof rawQuestion !== "string" ||
      typeof rawHelp !== "string" ||
      typeof rawMaxWords !== "string"
    ) {
      return { error: "Invalid application question data." };
    }

    const question = rawQuestion.trim();
    const helpText = rawHelp.trim();
    const maxWordsText = rawMaxWords.trim();

    if (!question && !helpText && !maxWordsText) {
      continue;
    }

    if (!question) {
      return { error: `Question ${index + 1} needs question text.` };
    }

    if (question.length > 10000) {
      return { error: `Question ${index + 1} is too long.` };
    }

    if (helpText.length > 10000) {
      return { error: `Help text for question ${index + 1} is too long.` };
    }

    let maxWords: number | null = null;

    if (maxWordsText) {
      maxWords = Number(maxWordsText);
      if (!Number.isSafeInteger(maxWords) || maxWords < 1 || maxWords > 10000) {
        return {
          error: `Question ${index + 1} must have a maximum word count between 1 and 10,000.`,
        };
      }
    }

    questions.push({
      id,
      question,
      helpText: helpText || null,
      maxWords,
      order: questions.length,
    });
  }

  const existingIds = questions.map((question) => question.id).filter(Boolean);
  if (new Set(existingIds).size !== existingIds.length) {
    return { error: "A question was submitted more than once." };
  }

  return { questions };
}

async function backfillApplicationAnswers(
  tx: Prisma.TransactionClient,
  opportunityId: string
) {
  const [applications, templates] = await Promise.all([
    tx.application.findMany({
      where: { opportunityId },
      select: { id: true },
    }),
    tx.applicationQuestionTemplate.findMany({
      where: { opportunityId },
      orderBy: { order: "asc" },
      select: { id: true, question: true },
    }),
  ]);

  if (applications.length === 0 || templates.length === 0) return;

  const applicationIds = applications.map((application) => application.id);
  const questionIds = templates.map((question) => question.id);

  const existingAnswers = await tx.applicationAnswer.findMany({
    where: {
      applicationId: { in: applicationIds },
      questionId: { in: questionIds },
    },
    select: { applicationId: true, questionId: true },
  });

  const existingKeys = new Set(
    existingAnswers.map((answer) => `${answer.applicationId}:${answer.questionId}`)
  );

  const missingAnswers = applications.flatMap((application) =>
    templates
      .filter(
        (question) =>
          !existingKeys.has(`${application.id}:${question.id}`)
      )
      .map((question) => ({
        applicationId: application.id,
        questionId: question.id,
        questionText: question.question,
      }))
  );

  if (missingAnswers.length > 0) {
    await tx.applicationAnswer.createMany({ data: missingAnswers });
  }
}

export interface AdminActionState {
  error?: string;
}

export async function createOpportunityAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requirePlatformAdmin();
  const parsed = parseOpportunityForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const questionResult = parseQuestionTemplates(formData);
  if (questionResult.error) return { error: questionResult.error };

  const opportunity = await db.opportunity.create({
    data: {
      ...parsed.data,
      createdById: admin.id,
      questions: {
        create: (questionResult.questions ?? []).map((question) => ({
          question: question.question,
          helpText: question.helpText,
          maxWords: question.maxWords,
          order: question.order,
        })),
      },
    },
  });

  revalidatePath("/admin/opportunities");
  redirect(`/admin/opportunities/${opportunity.id}/edit`);
}

export async function updateOpportunityAction(
  opportunityId: string,
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requirePlatformAdmin();

  const parsed = parseOpportunityForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const questionResult = parseQuestionTemplates(formData);
  if (questionResult.error) return { error: questionResult.error };

  const questions = questionResult.questions ?? [];

  try {
    await db.$transaction(async (tx) => {
      const existingQuestions = await tx.applicationQuestionTemplate.findMany({
        where: { opportunityId },
        select: { id: true },
      });

      const existingIds = new Set(existingQuestions.map((question) => question.id));
      const submittedIds = questions.map((question) => question.id).filter(Boolean);

      if (submittedIds.some((id) => !existingIds.has(id))) {
        throw new Error("A submitted question does not belong to this opportunity. Refresh and try again.");
      }

      await tx.opportunity.update({
        where: { id: opportunityId },
        data: parsed.data,
      });

      const retainedIds = submittedIds;

      await tx.applicationQuestionTemplate.deleteMany({
        where: {
          opportunityId,
          ...(retainedIds.length > 0 ? { id: { notIn: retainedIds } } : {}),
        },
      });

      for (const question of questions) {
        const data = {
          question: question.question,
          helpText: question.helpText,
          maxWords: question.maxWords,
          order: question.order,
        };

        if (question.id) {
          await tx.applicationQuestionTemplate.update({
            where: { id: question.id },
            data,
          });
        } else {
          await tx.applicationQuestionTemplate.create({
            data: { opportunityId, ...data },
          });
        }
      }

      // Existing applications receive any newly added questions.
      // Existing answers are preserved as snapshots if templates are edited.
      await backfillApplicationAnswers(tx, opportunityId);
    }, {
      maxWait: 10_000,
      timeout: 30_000,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not save the opportunity and its questions. Please try again.",
    };
  }

  revalidatePath("/admin/opportunities");
  revalidatePath(`/admin/opportunities/${opportunityId}/edit`);
  revalidatePath("/app/opportunities");
  revalidatePath("/app/applications");

  return {};
}

export async function deleteOpportunityAction(opportunityId: string) {
  await requirePlatformAdmin();
  await db.opportunity.delete({ where: { id: opportunityId } });
  revalidatePath("/admin/opportunities");
}

export async function verifyOpportunityAction(opportunityId: string) {
  await requirePlatformAdmin();
  await db.opportunity.update({
    where: { id: opportunityId },
    data: { verificationStatus: "VERIFIED", lastVerifiedAt: new Date() },
  });
  revalidatePath("/admin/opportunities");
}

export async function markExpiredAction(opportunityId: string) {
  await requirePlatformAdmin();
  await db.opportunity.update({
    where: { id: opportunityId },
    data: { verificationStatus: "EXPIRED" },
  });
  revalidatePath("/admin/opportunities");
}
