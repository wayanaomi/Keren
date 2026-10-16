"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { onboardingSchema } from "@/lib/validators/auth";
import { redirect } from "next/navigation";

export interface OnboardingState {
  error?: string;
}

export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();

  const parsed = onboardingSchema.safeParse({
    lookingFor: formData.getAll("lookingFor"),
    organizationName: formData.get("organizationName"),
    organizationType: formData.get("organizationType"),
    country: formData.get("country"),
    industry: formData.get("industry"),
    businessStage: formData.get("businessStage"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your answers and try again." };
  }

  const { lookingFor, organizationName, organizationType, country, industry, businessStage } = parsed.data;

  await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        type: organizationType,
        country,
        industry,
        businessStage,
      },
    });

    await tx.organizationMember.create({
      data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
    });

    await tx.subscription.create({
      data: { organizationId: organization.id, tier: "FREE" },
    });

    await tx.usage.create({ data: { organizationId: organization.id } });

    await tx.notificationPreference.create({ data: { organizationId: organization.id } });

    await tx.user.update({
      where: { id: user.id },
      data: { lookingFor, onboardingCompletedAt: new Date() },
    });
  }, {
    maxWait: 10_000,
    timeout: 20_000,
  });

  redirect("/app");
}
