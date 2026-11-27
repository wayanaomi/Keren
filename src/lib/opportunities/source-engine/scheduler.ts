import { db } from "@/lib/db";
import { syncOpportunitySourceRegistry } from "./dashboard";
import { OPPORTUNITY_SOURCE_REGISTRY } from "./registry";
import {
  OpportunitySourceLockedError,
} from "./runner";
import type {
  OpportunitySourceImportResult,
} from "./types";

import {
  importGrantsGovOpportunities,
} from "../sources/grants-gov";
import {
  importTedOpportunities,
} from "../sources/ted";
import {
  importTETFundOpportunities,
} from "../sources/tetfund";
import {
  importFeedOpportunities,
} from "./feeds";

interface SchedulerEnvironment {
  VERCEL_ENV?: string;
  OPPORTUNITY_DISCOVERY_ENABLED?: string;
}

interface SchedulerOptions {
  now?: Date;
  env?: SchedulerEnvironment;
  executionId?: string;
}

type Importer = () => Promise<OpportunitySourceImportResult>;

// Only connectors implemented and explicitly mapped here can run.
const SOURCE_IMPORTERS: Record<string, Importer> = {
  "grants-gov": () =>
    importGrantsGovOpportunities(null, "SCHEDULED"),

  ted: () =>
    importTedOpportunities(null, "SCHEDULED"),

  "fcdo-international-development-funding": () =>
    importFeedOpportunities(
      null,
      "fcdo-international-development-funding",
      "SCHEDULED",
    ),

  "ncair-opportunities": () =>
    importFeedOpportunities(
      null,
      "ncair-opportunities",
      "SCHEDULED",
    ),

  "tetfund-opportunities": () =>
    importTETFundOpportunities(null, "SCHEDULED"),
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runNextDueOpportunitySource(
  options: SchedulerOptions = {},
) {
  const now = options.now ?? new Date();
  const env = options.env ?? process.env;

  // This project currently shares its Production database with Preview.
  if (env.VERCEL_ENV === "preview") {
    return {
      status: "DISABLED" as const,
      reason: "preview-environment" as const,
    };
  }

  // Automatic imports require an explicit opt-in.
  if (env.OPPORTUNITY_DISCOVERY_ENABLED !== "true") {
    return {
      status: "DISABLED" as const,
      reason: "feature-flag-disabled" as const,
    };
  }

  // Ensure all registered sources exist in the source table.
  await syncOpportunitySourceRegistry();

  const eligibleKeys = OPPORTUNITY_SOURCE_REGISTRY
    .filter(
      (source) =>
        source.automated !== false &&
        typeof SOURCE_IMPORTERS[source.key] === "function",
    )
    .map((source) => source.key);

  if (eligibleKeys.length === 0) {
    return { status: "IDLE" as const };
  }

  // Select one overdue source. The runner performs the atomic lock claim.
  const dueSource = await db.opportunitySource.findFirst({
    where: {
      enabled: true,
      key: { in: eligibleKeys },
      nextRunAt: { lte: now },
      OR: [
        { lockedUntil: null },
        { lockedUntil: { lte: now } },
      ],
    },
    orderBy: [
      { nextRunAt: "asc" },
      { key: "asc" },
    ],
    select: { key: true },
  });

  if (!dueSource) {
    return { status: "IDLE" as const };
  }

  const importer = SOURCE_IMPORTERS[dueSource.key];

  if (!importer) {
    return { status: "IDLE" as const };
  }

  try {
    const importResult = await importer();

    console.info("[Keren Discovery] Source completed", {
      executionId: options.executionId ?? null,
      sourceKey: dueSource.key,
      runId: importResult.runId,
      status: importResult.status,
      scanned: importResult.scanned,
      imported: importResult.imported,
      duplicates: importResult.duplicates,
      skipped: importResult.skipped,
      failed: importResult.failed,
    });

    return {
      status: "COMPLETED" as const,
      sourceKey: dueSource.key,
      importResult,
    };
  } catch (error) {
    if (error instanceof OpportunitySourceLockedError) {
      return {
        status: "BUSY" as const,
        sourceKey: dueSource.key,
      };
    }

    const message = errorMessage(error);

    console.error("[Keren Discovery] Source failed", {
      executionId: options.executionId ?? null,
      sourceKey: dueSource.key,
      error: message,
    });

    // The runner records connector failures and retry timing.
    return {
      status: "FAILED" as const,
      sourceKey: dueSource.key,
      error: message,
    };
  }
}
