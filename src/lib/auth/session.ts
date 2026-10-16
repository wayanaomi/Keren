import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

/** Throws/redirects if unauthenticated. Use in server components/actions that require a session. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/**
 * Returns the caller's primary organization, enforcing that the organizationId
 * (if provided, e.g. from a route param) actually belongs to the current user.
 * Never trust a client-supplied organizationId without this check.
 */
export async function requireOrganization(organizationId?: string) {
  const user = await requireUser();

  const membership = await db.organizationMember.findFirst({
    where: {
      userId: user.id,
      ...(organizationId ? { organizationId } : {}),
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) redirect("/onboarding");

  return { user, organization: membership.organization, role: membership.role };
}

export async function requirePlatformAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.platformRole !== "ADMIN" && user.platformRole !== "SUPERADMIN")) {
    redirect("/app");
  }
  return user;
}
