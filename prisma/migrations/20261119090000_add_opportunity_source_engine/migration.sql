-- CreateEnum
CREATE TYPE "OpportunitySourceMethod" AS ENUM ('API', 'ATOM', 'RSS', 'HTML', 'APIFY');

-- CreateEnum
CREATE TYPE "OpportunitySourceRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "OpportunitySource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "method" "OpportunitySourceMethod" NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "listingUrl" TEXT NOT NULL,
    "termsUrl" TEXT,
    "authEnvVar" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "pollIntervalMinutes" INTEGER NOT NULL DEFAULT 1440,
    "nextRunAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lastRunStartedAt" TIMESTAMP(3),
    "lastRunSucceededAt" TIMESTAMP(3),
    "lastError" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunitySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunitySourceRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "OpportunitySourceRunStatus" NOT NULL DEFAULT 'RUNNING',
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "triggeredByUserId" TEXT,
    "cursorBefore" TEXT,
    "cursorAfter" TEXT,
    "scanned" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "OpportunitySourceRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunitySourceItem" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "externalId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "title" TEXT NOT NULL,
    "contentHash" TEXT,
    "sourceStatus" TEXT,
    "sourcePublishedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "OpportunitySourceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpportunitySource_key_key" ON "OpportunitySource"("key");

-- CreateIndex
CREATE INDEX "OpportunitySource_enabled_nextRunAt_idx" ON "OpportunitySource"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "OpportunitySource_category_enabled_idx" ON "OpportunitySource"("category", "enabled");

-- CreateIndex
CREATE INDEX "OpportunitySourceRun_sourceId_startedAt_idx" ON "OpportunitySourceRun"("sourceId", "startedAt");

-- CreateIndex
CREATE INDEX "OpportunitySourceRun_status_startedAt_idx" ON "OpportunitySourceRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "OpportunitySourceItem_opportunityId_idx" ON "OpportunitySourceItem"("opportunityId");

-- CreateIndex
CREATE INDEX "OpportunitySourceItem_canonicalUrl_idx" ON "OpportunitySourceItem"("canonicalUrl");

-- CreateIndex
CREATE INDEX "OpportunitySourceItem_contentHash_idx" ON "OpportunitySourceItem"("contentHash");

-- CreateIndex
CREATE INDEX "OpportunitySourceItem_sourceUpdatedAt_idx" ON "OpportunitySourceItem"("sourceUpdatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunitySourceItem_sourceId_externalId_key" ON "OpportunitySourceItem"("sourceId", "externalId");

-- AddForeignKey
ALTER TABLE "OpportunitySourceRun" ADD CONSTRAINT "OpportunitySourceRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "OpportunitySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySourceItem" ADD CONSTRAINT "OpportunitySourceItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "OpportunitySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySourceItem" ADD CONSTRAINT "OpportunitySourceItem_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

