import Link from "next/link";
import { db } from "@/lib/db";
import { VerificationBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { deleteOpportunityAction, verifyOpportunityAction, markExpiredAction } from "./actions";

export default async function AdminOpportunitiesPage() {
  const opportunities = await db.opportunity.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Opportunities</h1>
        <Link href="/admin/opportunities/new" className={buttonClasses("primary", "sm")}>
          Add opportunity
        </Link>
      </div>

      {opportunities.length === 0 ? (
        <EmptyState title="No opportunities yet" body="Add the first opportunity to populate the discovery feed." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-cream text-xs uppercase text-stone">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Type</th>
                <th className="p-3">Deadline</th>
                <th className="p-3">Status</th>
                <th className="p-3">Verification</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="p-3 font-medium text-ink">{o.title}</td>
                  <td className="p-3 text-stone">{o.type}</td>
                  <td className="p-3 text-stone">{formatDate(o.deadline)}</td>
                  <td className="p-3 text-stone">{o.status}</td>
                  <td className="p-3">
                    <VerificationBadge status={o.verificationStatus} />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/opportunities/${o.id}/edit`} className={buttonClasses("secondary", "sm")}>
                        Edit
                      </Link>
                      <form action={verifyOpportunityAction.bind(null, o.id)}>
                        <Button size="sm" variant="secondary" type="submit">
                          Verify
                        </Button>
                      </form>
                      <form action={markExpiredAction.bind(null, o.id)}>
                        <Button size="sm" variant="secondary" type="submit">
                          Expire
                        </Button>
                      </form>
                      <form action={deleteOpportunityAction.bind(null, o.id)}>
                        <Button size="sm" variant="danger" type="submit">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
