"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrganization } from "@/lib/auth/session";

export async function updateNotificationPreferencesAction(formData: FormData) {
  const { organization } = await requireOrganization();

  await db.notificationPreference.upsert({
    where: { organizationId: organization.id },
    create: {
      organizationId: organization.id,
      remind30d: formData.get("remind30d") === "on",
      remind14d: formData.get("remind14d") === "on",
      remind7d: formData.get("remind7d") === "on",
      remind3d: formData.get("remind3d") === "on",
      remind24h: formData.get("remind24h") === "on",
      emailEnabled: formData.get("emailEnabled") === "on",
      inAppEnabled: formData.get("inAppEnabled") === "on",
    },
    update: {
      remind30d: formData.get("remind30d") === "on",
      remind14d: formData.get("remind14d") === "on",
      remind7d: formData.get("remind7d") === "on",
      remind3d: formData.get("remind3d") === "on",
      remind24h: formData.get("remind24h") === "on",
      emailEnabled: formData.get("emailEnabled") === "on",
      inAppEnabled: formData.get("inAppEnabled") === "on",
    },
  });

  revalidatePath("/app/notifications");
}

export async function markNotificationReadAction(notificationId: string) {
  const { organization } = await requireOrganization();
  await db.notification.updateMany({
    where: { id: notificationId, organizationId: organization.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/app/notifications");
}
