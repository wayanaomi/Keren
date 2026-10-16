import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const user = await requireUser();

  const membership = await db.organizationMember.findFirst({ where: { userId: user.id } });
  if (membership) redirect("/app");

  return (
    <main className="min-h-screen bg-cream">
      <OnboardingWizard />
    </main>
  );
}
