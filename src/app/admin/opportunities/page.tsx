import Link from "next/link";
import { db } from "@/lib/db";
import { VerificationBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { deleteOpportunityAction, verifyOpportunityAction, markExpiredAction } from "./actions";
import { importGrantsGovAction, importTedAction } from "./source-actions";

function displayCount(value?: string) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

export default async function AdminOpportunitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    source?: string;
    imported?: string;
    duplicates?: string;
    skipped?: string;
    failed?: string;
    importError?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const opportunities = await db.opportunity.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Opportunities</h1>
        <div className="flex flex-wrap items-center gap-2">
          <form action={importGrantsGovAction}>
            <Button size="sm" variant="secondary" type="submit">
              Import from Grants.gov
            </Button>
          </form>
          <form action={importTedAction}>
            <Button size="sm" variant="secondary" type="submit">
              Import from TED
            </Button>
          </form>
          <Link href="/admin/opportunities/new" className={buttonClasses("primary", "sm")}>
            Add opportunity
          </Link>
        </div>
      </div>

      <p className="mb-4 text-sm text-stone">
        Grants.gov and TED imports are saved as drafts. Verify the official source,
        bidder eligibility and submission requirements before publication. TED buyer
        country is not treated as supplier eligibility.
      </p>

      {params.importError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {params.importError === "ted"
            ? "TED import failed. Check the server terminal logs and try again."
            : "Grants.gov import failed. Check the server terminal logs and try again."}
        </div>
      ) : params.imported !== undefined || params.duplicates !== undefined || params.skipped !== undefined || params.failed !== undefined ? (
        <div className="mb-4 rounded-lg border border-line bg-white p-3 text-sm text-ink">
          {params.source === "ted" ? "TED" : "Grants.gov"} import complete:{" "}
          {displayCount(params.imported)} imported,{" "}
          {displayCount(params.duplicates)} duplicates,{" "}
          {displayCount(params.skipped)} expired or incomplete records skipped,{" "}
          {displayCount(params.failed)} failed.
        </div>
      ) : null}

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
