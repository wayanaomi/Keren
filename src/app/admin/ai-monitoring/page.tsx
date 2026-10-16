import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function AiMonitoringPage() {
  const generations = await db.aiGeneration.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  const byService = generations.reduce<Record<string, { success: number; failed: number }>>((acc, g) => {
    acc[g.service] ??= { success: 0, failed: 0 };
    if (g.status === "SUCCESS") acc[g.service].success += 1;
    else acc[g.service].failed += 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold text-ink">AI monitoring</h1>

      {generations.length === 0 ? (
        <EmptyState title="No AI generations yet" body="AI usage will appear here once users generate drafts or match explanations." />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(byService).map(([service, counts]) => (
              <div key={service} className="rounded-lg border border-line bg-white p-4">
                <p className="text-xs text-stone">{service.replace(/_/g, " ")}</p>
                <p className="text-lg font-bold text-ink">
                  {counts.success} <span className="text-xs font-normal text-stone">success</span>
                </p>
                <p className="text-sm text-danger">{counts.failed} failed</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-cream text-xs uppercase text-stone">
                <tr>
                  <th className="p-3">Service</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Tokens</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((g) => (
                  <tr key={g.id} className="border-b border-line last:border-0">
                    <td className="p-3">{g.service.replace(/_/g, " ")}</td>
                    <td className="p-3">
                      <Badge tone={g.status === "SUCCESS" ? "verified" : "danger"}>{g.status}</Badge>
                    </td>
                    <td className="p-3 text-stone">
                      {g.promptTokens && g.completionTokens ? `${g.promptTokens + g.completionTokens}` : "—"}
                    </td>
                    <td className="p-3 text-stone">{formatDate(g.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
