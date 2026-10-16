import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default async function AdminUsersPage() {
  const organizations = await db.organization.findMany({
    include: { members: { include: { user: true } }, subscription: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold text-ink">Users & organizations</h1>

      {organizations.length === 0 ? (
        <EmptyState title="No organizations yet" body="Organizations appear here once users complete onboarding." />
      ) : (
        <div className="space-y-3">
          {organizations.map((org) => (
            <div key={org.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">{org.name}</p>
                  <p className="text-xs text-stone">
                    {org.type} · {org.country ?? "No country set"}
                  </p>
                </div>
                <Badge tone="orange">{org.subscription?.tier ?? "FREE"}</Badge>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs text-stone">
                {org.members.map((m) => (
                  <li key={m.id}>
                    {m.user.name ?? m.user.email} · {m.role}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
