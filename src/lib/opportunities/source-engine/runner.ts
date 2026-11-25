import { db } from "@/lib/db";
import type {
  OpportunitySourceDefinition,
  OpportunitySourceFetchResult,
  OpportunitySourceImportResult,
} from "./types";
import {
  canonicalizeSourceUrl,
  createOpportunityContentHash,
  createOpportunityIdentityHash,
} from "./identity";

interface RunOpportunitySourceImportInput {
  source: OpportunitySourceDefinition;
  adminUserId: string;
  trigger?: "MANUAL" | "SCHEDULED" | "RETRY";
  fetchItems: () => Promise<OpportunitySourceFetchResult>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runOpportunitySourceImport(
  input: RunOpportunitySourceImportInput,
): Promise<OpportunitySourceImportResult> {
  const { source, adminUserId } = input;

  const sourceRecord = await db.opportunitySource.upsert({
    where: { key: source.key },
    create: {
      key: source.key,
      name: source.name,
      organization: source.organization,
      category: source.category,
      method: source.method,
      websiteUrl: source.websiteUrl,
      listingUrl: source.listingUrl,
      termsUrl: source.termsUrl ?? null,
      authEnvVar: source.authEnvVar ?? null,
      pollIntervalMinutes: source.pollIntervalMinutes ?? 1440,
    },
    update: {
      name: source.name,
      organization: source.organization,
      category: source.category,
      method: source.method,
      websiteUrl: source.websiteUrl,
      listingUrl: source.listingUrl,
      termsUrl: source.termsUrl ?? null,
      authEnvVar: source.authEnvVar ?? null,
      pollIntervalMinutes: source.pollIntervalMinutes ?? 1440,
    },
  });

  const run = await db.opportunitySourceRun.create({
    data: {
      sourceId: sourceRecord.id,
      trigger: input.trigger ?? "MANUAL",
      triggeredByUserId: adminUserId,
    },
  });

  await db.opportunitySource.update({
    where: { id: sourceRecord.id },
    data: {
      lastRunStartedAt: run.startedAt,
      lastError: null,
    },
  });

  let fetched: OpportunitySourceFetchResult;

  try {
    fetched = await input.fetchItems();
  } catch (error) {
    const message = errorMessage(error).slice(0, 4000);
    const finishedAt = new Date();

    await db.$transaction(async (tx) => {
      await tx.opportunitySourceRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          failed: 1,
          errorSummary: message,
          finishedAt,
        },
      });

      await tx.opportunitySource.update({
        where: { id: sourceRecord.id },
        data: {
          lastError: message,
          consecutiveFailures: { increment: 1 },
          nextRunAt: new Date(
            finishedAt.getTime() +
              (source.pollIntervalMinutes ?? 1440) * 60_000,
          ),
        },
      });
    }, { maxWait: 15_000, timeout: 60_000 });

    throw error;
  }

  const candidates = fetched.items;

  const result = {
    scanned: fetched.scanned,
    imported: 0,
    duplicates: 0,
    skipped: fetched.skipped ?? 0,
    failed: fetched.failed ?? 0,
  };

  const itemErrors: string[] = [];

  for (const candidate of candidates) {
    try {
      const externalId = candidate.externalId.trim();
      const title = candidate.title.trim();

      if (!externalId || !title || !candidate.sourceUrl.trim()) {
        result.skipped += 1;
        continue;
      }

      // Validate the original source URL and canonicalise identity separately.
      canonicalizeSourceUrl(candidate.sourceUrl);

      const canonicalUrl = canonicalizeSourceUrl(
        candidate.canonicalUrl?.trim() || candidate.sourceUrl,
      );

      const contentHash =
        candidate.contentHash ??
        createOpportunityContentHash(
          title,
          String(candidate.opportunity.description ?? ""),
        );
      const identityHash = createOpportunityIdentityHash({
        title,
        funder: String(candidate.opportunity.funder ?? source.organization),
        type: String(candidate.opportunity.type ?? source.opportunityType ?? "OTHER"),
        openingDate: candidate.opportunity.openingDate as Date | string | null | undefined,
        deadline: candidate.opportunity.deadline as Date | string | null | undefined,
        reference: candidate.identityReference,
      });

      const now = new Date();
      const rawDeadline = candidate.opportunity.deadline;
      const deadlineDate =
        rawDeadline instanceof Date
          ? rawDeadline
          : typeof rawDeadline === "string"
            ? new Date(rawDeadline)
            : null;
      const hasExpiredDeadline =
        deadlineDate !== null &&
        Number.isFinite(deadlineDate.getTime()) &&
        deadlineDate.getTime() < now.getTime();
      
      const outcome = await db.$transaction(async (tx) => {
        const uniqueWhere = {
          sourceId_externalId: {
            sourceId: sourceRecord.id,
            externalId,
          },
        };

        const existingByExternalId =
          await tx.opportunitySourceItem.findUnique({
            where: uniqueWhere,
            select: { id: true },
          });

        if (existingByExternalId) {
          await tx.opportunitySourceItem.update({
            where: { id: existingByExternalId.id },
            data: {
              lastSeenAt: now,
              title,
              canonicalUrl,
              contentHash,
              identityHash,
              sourceStatus: candidate.sourceStatus ?? undefined,
              sourceUpdatedAt: candidate.sourceUpdatedAt ?? undefined,
              ...(candidate.metadata !== undefined
                ? { metadata: candidate.metadata }
                : {}),
            },
          });

          return "duplicate" as const;
        }

        const identityAlternatives = [
          { sourceUrl: candidate.sourceUrl },
          { canonicalUrl },
          ...(identityHash ? [{ identityHash }] : []),
        ];

        const matchingItem =
          await tx.opportunitySourceItem.findFirst({
            where: {
              opportunityId: { not: null },
              OR: identityAlternatives,
            },
            orderBy: { firstSeenAt: "asc" },
            select: { opportunityId: true },
          });

        const existingOpportunity = matchingItem?.opportunityId
          ? await tx.opportunity.findUnique({
              where: { id: matchingItem.opportunityId },
              select: { id: true },
            })
          : await tx.opportunity.findFirst({
              where: { sourceUrl: candidate.sourceUrl },
              select: { id: true },
            });

        if (existingOpportunity) {
          await tx.opportunitySourceItem.create({
            data: {
              sourceId: sourceRecord.id,
              opportunityId: existingOpportunity.id,
              externalId,
              sourceUrl: candidate.sourceUrl,
              canonicalUrl,
              title,
              contentHash,
              identityHash,
              sourceStatus: candidate.sourceStatus ?? null,
              sourcePublishedAt: candidate.sourcePublishedAt ?? null,
              sourceUpdatedAt: candidate.sourceUpdatedAt ?? null,
              firstSeenAt: now,
              lastSeenAt: now,
              ...(candidate.metadata !== undefined
                ? { metadata: candidate.metadata }
                : {}),
            },
          });

          return "duplicate" as const;
        }

        const opportunity = await tx.opportunity.create({
          data: {
            ...candidate.opportunity,
            title,
            sourceUrl: candidate.sourceUrl,
            sourceName: source.name,
            status: "DRAFT",
            verificationStatus: hasExpiredDeadline
              ? "EXPIRED"
              : "NEEDS_VERIFICATION",
            eligibilityStatus: "NEEDS_REVIEW",
            eligibilityEvidence: null,
            eligibilityEvidenceUrl: null,
            eligibilityReviewedAt: null,
            eligibilityReviewedById: null,
            createdById: adminUserId,
          },
          select: { id: true },
        });

        await tx.opportunitySourceItem.create({
          data: {
            sourceId: sourceRecord.id,
            opportunityId: opportunity.id,
            externalId,
            sourceUrl: candidate.sourceUrl,
            canonicalUrl,
            title,
            contentHash,
            identityHash,
            sourceStatus: candidate.sourceStatus ?? null,
            sourcePublishedAt: candidate.sourcePublishedAt ?? null,
            sourceUpdatedAt: candidate.sourceUpdatedAt ?? null,
            firstSeenAt: now,
            lastSeenAt: now,
            ...(candidate.metadata !== undefined
              ? { metadata: candidate.metadata }
              : {}),
          },
        });

        return "imported" as const;
      }, { maxWait: 15_000, timeout: 60_000 });

      if (outcome === "imported") result.imported += 1;
      else result.duplicates += 1;
    } catch (error) {
      result.failed += 1;
      itemErrors.push(
        `${candidate.externalId || "unknown"}: ${errorMessage(error)}`,
      );
    }
  }

  const status =
    result.failed > 0
      ? result.imported > 0
        ? "PARTIAL"
        : "FAILED"
      : "SUCCEEDED";

  const finishedAt = new Date();
  const errorSummary =
    itemErrors.length > 0
      ? itemErrors.join("\n").slice(0, 8000)
      : null;

  await db.$transaction(async (tx) => {
    await tx.opportunitySourceRun.update({
      where: { id: run.id },
      data: {
        status,
        scanned: result.scanned,
        imported: result.imported,
        duplicates: result.duplicates,
        skipped: result.skipped,
        failed: result.failed,
        errorSummary,
        finishedAt,
      },
    });

    await tx.opportunitySource.update({
      where: { id: sourceRecord.id },
      data: {
        lastError: errorSummary,
        lastRunSucceededAt:
          status === "SUCCEEDED" ? finishedAt : undefined,
        consecutiveFailures:
          result.failed > 0 ? { increment: 1 } : 0,
        nextRunAt: new Date(
          finishedAt.getTime() +
            (source.pollIntervalMinutes ?? 1440) * 60_000,
        ),
      },
    });
  }, { maxWait: 15_000, timeout: 60_000 });

  return {
    ...result,
    runId: run.id,
    status,
    ...(fetched.totalAvailable !== undefined
      ? { totalAvailable: fetched.totalAvailable }
      : {}),
  };
}
