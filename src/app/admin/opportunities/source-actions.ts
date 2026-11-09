"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { importGrantsGovOpportunities } from "@/lib/opportunities/sources/grants-gov";
import { importTedOpportunities } from "@/lib/opportunities/sources/ted";

export async function importGrantsGovAction() {
  const admin = await requirePlatformAdmin();

  let result: Awaited<ReturnType<typeof importGrantsGovOpportunities>>;

  try {
    result = await importGrantsGovOpportunities(admin.id);
  } catch (error) {
    console.error("[Keren Admin] Grants.gov import failed:", error);
    redirect("/admin/opportunities?importError=grants-gov");
  }

  revalidatePath("/admin/opportunities");
  revalidatePath("/app/opportunities");

  redirect(
    `/admin/opportunities?source=grants-gov&imported=${result.imported}&duplicates=${result.duplicates}&skipped=${result.skipped}&failed=${result.failed}`,
  );
}

export async function importTedAction() {
  const admin = await requirePlatformAdmin();

  let result: Awaited<ReturnType<typeof importTedOpportunities>>;

  try {
    result = await importTedOpportunities(admin.id);
  } catch (error) {
    console.error("[Keren Admin] TED import failed:", error);
    redirect("/admin/opportunities?importError=ted");
  }

  revalidatePath("/admin/opportunities");
  revalidatePath("/app/opportunities");

  redirect(
    `/admin/opportunities?source=ted&imported=${result.imported}&duplicates=${result.duplicates}&skipped=${result.skipped}&failed=${result.failed}`,
  );
}
