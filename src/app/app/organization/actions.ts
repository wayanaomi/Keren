"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrganization } from "@/lib/auth/session";
import { organizationProfileSchema } from "@/lib/validators/organization";
import { computeProfileCompleteness } from "@/lib/organization/context";

export interface OrgActionState {
  error?: string;
  success?: boolean;
}

function toList(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function updateOrganizationAction(_prev: OrgActionState, formData: FormData): Promise<OrgActionState> {
  const { organization } = await requireOrganization();

  const raw = Object.fromEntries(formData.entries());
  const parsed = organizationProfileSchema.safeParse({
    ...raw,
    marketsServed: toList(formData.get("marketsServed")),
    sdgs: toList(formData.get("sdgs")),
    geographicImpact: toList(formData.get("geographicImpact")),
    services: toList(formData.get("services")),
    certifications: toList(formData.get("certifications")),
    areasOfExpertise: toList(formData.get("areasOfExpertise")),
    foundedYear: raw.foundedYear || undefined,
    employeeCount: raw.employeeCount || undefined,
    annualTurnover: raw.annualTurnover || undefined,
    amountRaised: raw.amountRaised || undefined,
    fundingRequired: raw.fundingRequired || undefined,
    fundingStage: raw.fundingStage || undefined,
    businessStage: raw.businessStage || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const updated = await db.organization.update({
    where: { id: organization.id },
    data: parsed.data,
  });

  await db.organization.update({
    where: { id: organization.id },
    data: { profileCompleteness: computeProfileCompleteness(updated) },
  });

  revalidatePath("/app/organization");
  revalidatePath("/app");
  return { success: true };
}

export async function addFounderAction(formData: FormData) {
  const { organization } = await requireOrganization();
  const name = formData.get("name") as string;
  if (!name?.trim()) return;

  await db.founder.create({
    data: {
      organizationId: organization.id,
      name,
      role: (formData.get("role") as string) || null,
      experience: (formData.get("experience") as string) || null,
      linkedinUrl: (formData.get("linkedinUrl") as string) || null,
      bio: (formData.get("bio") as string) || null,
    },
  });

  revalidatePath("/app/organization");
}

export async function removeFounderAction(founderId: string) {
  const { organization } = await requireOrganization();
  await db.founder.deleteMany({ where: { id: founderId, organizationId: organization.id } });
  revalidatePath("/app/organization");
}
