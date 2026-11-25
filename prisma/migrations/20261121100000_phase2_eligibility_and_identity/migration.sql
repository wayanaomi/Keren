-- Phase 2A: separate evidence-backed eligibility review from source verification.
CREATE TYPE "OpportunityEligibilityStatus" AS ENUM (
  'UNKNOWN',
  'NEEDS_REVIEW',
  'VERIFIED_ELIGIBLE',
  'VERIFIED_INELIGIBLE'
);

ALTER TABLE "Opportunity"
  ADD COLUMN "eligibilityStatus" "OpportunityEligibilityStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "eligibilityEvidence" TEXT,
  ADD COLUMN "eligibilityEvidenceUrl" TEXT,
  ADD COLUMN "eligibilityReviewedAt" TIMESTAMP(3),
  ADD COLUMN "eligibilityReviewedById" TEXT;

ALTER TABLE "OpportunitySourceItem"
  ADD COLUMN "identityHash" TEXT;

CREATE INDEX "Opportunity_eligibilityStatus_status_idx"
  ON "Opportunity"("eligibilityStatus", "status");

CREATE INDEX "OpportunitySourceItem_identityHash_idx"
  ON "OpportunitySourceItem"("identityHash");
