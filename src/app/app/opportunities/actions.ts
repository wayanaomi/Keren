"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOrganization } from "@/lib/auth/session";

export async function toggleSaveOpportunityAction(opportunityId: string) {
  const { user, organization } = await requireOrganization();

  const existing = await db.savedOpportunity.findUnique({
    where: { organizationId_opportunityId: { organizationId: organization.id, opportunityId } },
  });

  if (existing) {
    await db.savedOpportunity.delete({ where: { id: existing.id } });
  } else {
    await db.savedOpportunity.create({
      data: { organizationId: organization.id, opportunityId, userId: user.id },
    });
  }

  revalidatePath("/app");
  revalidatePath("/app/opportunities");
  revalidatePath("/app/saved");
  return { saved: !existing };
}

export async function startApplicationAction(opportunityId: string) {
  const { user, organization } = await requireOrganization();

  const opportunity = await db.opportunity.findUnique({
    where: { id: opportunityId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!opportunity) throw new Error("Opportunity not found");

  const application = await db.application.upsert({
    where: { organizationId_opportunityId: { organizationId: organization.id, opportunityId } },
    update: {},
    create: {
      organizationId: organization.id,
      opportunityId,
      createdById: user.id,
      status: "CONSIDERING",
      answers: {
        create: opportunity.questions.map((q) => ({
          questionId: q.id,
          questionText: q.question,
        })),
      },
      requirements: {
        create: opportunity.requiredDocuments.map((label) => ({ label })),
      },
    },
  });

  revalidatePath("/app/applications");
  redirect(`/app/applications/${application.id}`);
}
