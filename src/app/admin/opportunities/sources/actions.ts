"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  importGrantsGovOpportunities,
} from "@/lib/opportunities/sources/grants-gov";
import {
  importTedOpportunities,
} from "@/lib/opportunities/sources/ted";
import {
  importFeedOpportunities,
} from "@/lib/opportunities/source-engine/feeds";

const SOURCES_PATH = "/admin/opportunities/sources";

export async function toggleOpportunitySourceAction(
  formData: FormData,
) {
  await requirePlatformAdmin();

  const sourceId = formData.get("sourceId");
  const enabledValue = formData.get("enabled");

  if (
    typeof sourceId !== "string" ||
    !sourceId.trim() ||
    (enabledValue !== "true" && enabledValue !== "false")
  ) {
    redirect(`${SOURCES_PATH}?error=invalid-action`);
  }

  try {
    const source = await db.opportunitySource.findUnique({
      where: { id: sourceId },
      select: { id: true },
    });

    if (!source) {
      redirect(`${SOURCES_PATH}?error=source-not-found`);
    }

    await db.opportunitySource.update({
      where: { id: sourceId },
      data: {
        enabled: enabledValue === "true",
        nextRunAt: enabledValue === "true" ? new Date() : null,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("[Keren Admin] Source toggle failed:", error);
    redirect(`${SOURCES_PATH}?error=database`);
  }

  revalidatePath(SOURCES_PATH);
  redirect(`${SOURCES_PATH}?updated=1`);
}

export async function runOpportunitySourceAction(
  formData: FormData,
) {
  const admin = await requirePlatformAdmin();
  const sourceKey = formData.get("sourceKey");

  if (typeof sourceKey !== "string") {
    redirect(`${SOURCES_PATH}?error=invalid-source`);
  }

  let result;

  try {
    switch (sourceKey) {
      case "grants-gov":
        result = await importGrantsGovOpportunities(admin.id);
        break;

      case "ted":
        result = await importTedOpportunities(admin.id);
        break;

      case "afdb-project-procurement":
        redirect(`${SOURCES_PATH}?error=access-restricted`);

      case "fcdo-international-development-funding":
        result = await importFeedOpportunities(admin.id, sourceKey);
        break;

      case "ncair-opportunities":
        result = await importFeedOpportunities(admin.id, sourceKey);
        break;

      default:
        redirect(`${SOURCES_PATH}?error=connector-not-available`);
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error(
      `[Keren Admin] Source import failed (${sourceKey}):`,
      error,
    );

    redirect(
      `${SOURCES_PATH}?error=import-failed&source=${encodeURIComponent(sourceKey)}`,
    );
  }

  revalidatePath(SOURCES_PATH);
  revalidatePath("/admin/opportunities");
  revalidatePath("/app/opportunities");

  redirect(
    `${SOURCES_PATH}?completed=1&source=${encodeURIComponent(sourceKey)}&imported=${result.imported}&duplicates=${result.duplicates}&skipped=${result.skipped}&failed=${result.failed}&runId=${encodeURIComponent(result.runId)}`,
  );
}
