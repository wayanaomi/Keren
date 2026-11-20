import {
  getOpportunitySourceDashboard,
} from "@/lib/opportunities/source-engine/dashboard";
import {
  OPPORTUNITY_SOURCE_REGISTRY,
} from "@/lib/opportunities/source-engine/registry";
import {
  runOpportunitySourceAction,
  toggleOpportunitySourceAction,
} from "./actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  updated?: string;
  completed?: string;
  source?: string;
  imported?: string;
  duplicates?: string;
  skipped?: string;
  failed?: string;
  runId?: string;
};

const roadmap = [
  {
    category: "UN agencies",
    organizations: "UNDP, UNICEF, WHO, WFP, UNOPS and other UN entities",
  },
  {
    category: "Nigeria public institutions",
    organizations: "NNPC, NUPRC, TETFund, NITDA and other government agencies",
  },
  {
    category: "Foundations and bilateral donors",
    organizations:
      "Gates Foundation, Mastercard Foundation, Tony Elumelu Foundation, FCDO, GIZ, KfW, AFD, JICA and Open Society",
  },
  {
    category: "Accelerators and venture programmes",
    organizations:
      "Google for Startups, Y Combinator, Techstars, Catalyst Fund and similar programmes",
  },
];

function count(value?: string) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function sourceDisplayName(source?: string) {
  switch (source) {
    case "ted":
      return "TED";
    case "grants-gov":
      return "Grants.gov";
    case "fcdo-international-development-funding":
      return "FCDO";
    case "afdb-project-procurement":
      return "African Development Bank";
    default:
      return "Opportunity source";
  }
}

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function runStatusClass(status: string) {
  switch (status) {
    case "SUCCEEDED":
      return "border-green-200 bg-green-50 text-green-800";
    case "PARTIAL":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-800";
    case "RUNNING":
      return "border-blue-200 bg-blue-50 text-blue-800";
    default:
      return "border-line bg-cream text-stone";
  }
}

function errorMessage(error?: string) {
  switch (error) {
    case "invalid-action":
    case "invalid-source":
      return "The requested action was invalid. Please try again.";
    case "source-not-found":
      return "That source could not be found. Refresh the page and try again.";
    case "access-restricted":
      return "AfDB currently blocks automated access to its official feeds and portal. Manual import is disabled until an approved access route is available.";
    case "connector-not-available":
      return "A working connector is not available for that source yet.";
    case "import-failed":
      return "The source import failed. Check the server logs and latest run history.";
    case "database":
      return "The source database is unavailable. Confirm that the opportunity source migration has been applied.";
    default:
      return error ? "The requested operation could not be completed." : null;
  }
}

export default async function OpportunitySourcesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  let sources: Awaited<
    ReturnType<typeof getOpportunitySourceDashboard>
  > = [];

  let databaseReady = true;

  try {
    sources = await getOpportunitySourceDashboard();
  } catch (error) {
    databaseReady = false;
    console.error(
      "[Keren Admin] Could not load opportunity source dashboard:",
      error,
    );
  }

  const error = errorMessage(params.error);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-orange">
            Opportunity discovery
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">
            Opportunity sources
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone">
            Manage official platforms from which Keren discovers grants,
            tenders, accelerators, funding programmes and business opportunities.
          </p>
        </div>

        <span className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-stone">
          {OPPORTUNITY_SOURCE_REGISTRY.length} implemented connectors
        </span>
      </header>

      {!databaseReady ? (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">
            Source database unavailable
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            The source catalogue is available in the application code, but
            KEREN cannot currently access its database-backed controls and
            import history. Check the Supabase connection and confirm that the
            source migration is applied. No import was started by opening this page.
          </p>
        </section>
      ) : (
        <section className="rounded-lg border border-line bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-stone">Registered sources</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {sources.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone">Enabled for future scheduling</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {sources.filter((source) => source.enabled).length}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone">Tracked source notices</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {sources.reduce(
                  (total, source) => total + source._count.items,
                  0,
                )}
              </p>
            </div>
          </div>
        </section>
      )}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {params.updated === "1" ? (
        <div className="rounded-lg border border-line bg-white p-3 text-sm text-ink">
          Source settings updated.
        </div>
      ) : null}

      {params.completed === "1" ? (
        <div className="rounded-lg border border-line bg-white p-4">
          <h2 className="font-semibold text-ink">Import completed</h2>
          <p className="mt-1 text-sm text-stone">
            {sourceDisplayName(params.source)}:
            {" "}{count(params.imported)} imported,
            {" "}{count(params.duplicates)} duplicates,
            {" "}{count(params.skipped)} skipped,
            {" "}{count(params.failed)} failed.
          </p>
          {params.runId ? (
            <p className="mt-1 break-all text-xs text-stone">
              Run ID: {params.runId}
            </p>
          ) : null}
        </div>
      ) : null}

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-ink">Registered connectors</h2>
          <p className="mt-1 text-sm text-stone">
            Manual imports are available for implemented connectors. Enabling
            a source only marks it for future scheduling; automatic scheduling
            is not active yet.
          </p>
        </div>

        {databaseReady ? (
          <div className="space-y-4">
            {sources.map((source) => {
              const latestRun = source.runs[0];
              const isAccessRestricted =
                source.key === "afdb-project-procurement";
              const canRun =
                !isAccessRestricted &&
                (source.key === "grants-gov" ||
                  source.key === "ted" ||
                  source.method === "RSS" ||
                  source.method === "ATOM");

              return (
                <article
                  key={source.id}
                  className="rounded-lg border border-line bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink">
                          {source.name}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            source.enabled
                              ? "border-green-200 bg-green-50 text-green-800"
                              : "border-line bg-cream text-stone"
                          }`}
                        >
                          {source.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-stone">
                        {source.organization} · {source.category} · {source.method}
                      </p>
                      <a
                        href={source.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-orange hover:underline"
                      >
                        Open official source ↗
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <form action={toggleOpportunitySourceAction}>
                        <input
                          type="hidden"
                          name="sourceId"
                          value={source.id}
                        />
                        <input
                          type="hidden"
                          name="enabled"
                          value={source.enabled ? "false" : "true"}
                        />
                        <Button type="submit" variant="secondary" size="sm">
                          {source.enabled ? "Disable" : "Enable"}
                        </Button>
                      </form>

                      {canRun ? (
                        <form action={runOpportunitySourceAction}>
                          <input
                            type="hidden"
                            name="sourceKey"
                            value={source.key}
                          />
                          <Button type="submit" size="sm">
                            Run import
                          </Button>
                        </form>
                      ) : (
                        <Button type="button" size="sm" disabled>
                          Connector unavailable
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-stone">Tracked notices</p>
                      <p className="mt-1 font-semibold text-ink">
                        {source._count.items}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone">Last run started</p>
                      <p className="mt-1 text-sm font-medium text-ink">
                        {dateLabel(source.lastRunStartedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone">Last successful run</p>
                      <p className="mt-1 text-sm font-medium text-ink">
                        {dateLabel(source.lastRunSucceededAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone">Latest run status</p>
                      {latestRun ? (
                        <span
                          className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${runStatusClass(latestRun.status)}`}
                        >
                          {latestRun.status}
                        </span>
                      ) : (
                        <p className="mt-1 text-sm font-medium text-stone">
                          Never run
                        </p>
                      )}
                    </div>
                  </div>

                  {source.lastError ? (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
                      {source.lastError}
                    </div>
                  ) : null}

                  <div className="mt-4 border-t border-line pt-4">
                    <h4 className="text-sm font-semibold text-ink">
                      Recent run history
                    </h4>

                    {source.runs.length === 0 ? (
                      <p className="mt-2 text-sm text-stone">
                        No imports have been recorded.
                      </p>
                    ) : (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[600px] text-left text-xs">
                          <thead className="text-stone">
                            <tr>
                              <th className="py-2 pr-3">Started</th>
                              <th className="py-2 pr-3">Trigger</th>
                              <th className="py-2 pr-3">Status</th>
                              <th className="py-2 pr-3">Scanned</th>
                              <th className="py-2 pr-3">Imported</th>
                              <th className="py-2 pr-3">Duplicates</th>
                              <th className="py-2 pr-3">Skipped</th>
                              <th className="py-2">Failed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {source.runs.map((run) => (
                              <tr
                                key={run.id}
                                className="border-t border-line"
                              >
                                <td className="py-2 pr-3">
                                  {dateLabel(run.startedAt)}
                                </td>
                                <td className="py-2 pr-3">{run.trigger}</td>
                                <td className="py-2 pr-3">
                                  <span
                                    className={`rounded-full border px-2 py-1 font-semibold ${runStatusClass(run.status)}`}
                                  >
                                    {run.status}
                                  </span>
                                </td>
                                <td className="py-2 pr-3">{run.scanned}</td>
                                <td className="py-2 pr-3">{run.imported}</td>
                                <td className="py-2 pr-3">{run.duplicates}</td>
                                <td className="py-2 pr-3">{run.skipped}</td>
                                <td className="py-2">{run.failed}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {OPPORTUNITY_SOURCE_REGISTRY.map((source) => (
              <article
                key={source.key}
                className="rounded-lg border border-line bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-ink">{source.name}</h3>
                    <p className="mt-1 text-sm text-stone">
                      {source.organization} · {source.category} · {source.method}
                    </p>
                  </div>
                  <span className="rounded-full border border-line bg-cream px-2.5 py-1 text-xs text-stone">
                    Migration pending
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-ink">Expansion roadmap</h2>
          <p className="mt-1 text-sm text-stone">
            Target groups for future connector releases. These are not active
            integrations yet.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {roadmap.map((group) => (
            <article
              key={group.category}
              className="rounded-lg border border-line bg-white p-4"
            >
              <h3 className="font-semibold text-ink">{group.category}</h3>
              <p className="mt-2 text-sm leading-6 text-stone">
                {group.organizations}
              </p>
              <p className="mt-3 text-xs font-medium text-stone">
                Planned · Connector not yet configured
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-ink">Import and verification policy</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone">
          <li>Every imported opportunity retains its official source URL and identity.</li>
          <li>Duplicate notices are tracked instead of inserted again.</li>
          <li>New discoveries remain drafts until an administrator verifies and publishes them.</li>
          <li>Unknown eligibility, amounts and deadlines are never invented.</li>
        </ul>
      </section>
    </div>
  );
}
