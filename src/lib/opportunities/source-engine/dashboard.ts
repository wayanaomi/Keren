import { db } from "@/lib/db";
import { OPPORTUNITY_SOURCE_REGISTRY } from "./registry";

export async function syncOpportunitySourceRegistry() {
  await Promise.all(
    OPPORTUNITY_SOURCE_REGISTRY.map((source) =>
      db.opportunitySource.upsert({
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
      }),
    ),
  );
}

export async function getOpportunitySourceDashboard() {
  await syncOpportunitySourceRegistry();

  return db.opportunitySource.findMany({
    orderBy: [
      { category: "asc" },
      { name: "asc" },
    ],
    include: {
      _count: {
        select: { items: true },
      },
      runs: {
        orderBy: { startedAt: "desc" },
        take: 5,
      },
    },
  });
}
