"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { opportunitySchema } from "@/lib/validators/opportunity";

function toList(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseOpportunityForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return opportunitySchema.safeParse({
    ...raw,
    eligibleCountries: toList(formData.get("eligibleCountries")).flatMap((v) => v.split(",").map((s) => s.trim())),
    applicantTypes: formData.getAll("applicantTypes"),
    businessStages: formData.getAll("businessStages"),
    eligibilityRequirements: toList(formData.get("eligibilityRequirements")),
    requiredDocuments: toList(formData.get("requiredDocuments")),
    keywords: toList(formData.get("keywords")).flatMap((v) => v.split(",").map((s) => s.trim())),
    fundingAmount: raw.fundingAmount || undefined,
    minFunding: raw.minFunding || undefined,
    maxFunding: raw.maxFunding || undefined,
    minRevenue: raw.minRevenue || undefined,
    minEmployees: raw.minEmployees || undefined,
    openingDate: raw.openingDate || undefined,
    deadline: raw.deadline || undefined,
  });
}

export interface AdminActionState {
  error?: string;
}

export async function createOpportunityAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requirePlatformAdmin();
  const parsed = parseOpportunityForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const opportunity = await db.opportunity.create({
    data: { ...parsed.data, createdById: admin.id },
  });

  revalidatePath("/admin/opportunities");
  redirect(`/admin/opportunities/${opportunity.id}/edit`);
}

export async function updateOpportunityAction(
  opportunityId: string,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requirePlatformAdmin();
  const parsed = parseOpportunityForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db.opportunity.update({ where: { id: opportunityId }, data: parsed.data });
  revalidatePath("/admin/opportunities");
  revalidatePath(`/admin/opportunities/${opportunityId}/edit`);
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
  await db.opportunity.update({ where: { id: opportunityId }, data: { verificationStatus: "EXPIRED" } });
  revalidatePath("/admin/opportunities");
}
