import type {
  OpportunitySourceMethod,
  OpportunityType,
  Prisma,
} from "@prisma/client";

export interface OpportunitySourceDefinition {
  key: string;
  name: string;
  organization: string;
  category: string;
  method: OpportunitySourceMethod;
  opportunityType?: OpportunityType;
  websiteUrl: string;
  listingUrl: string;
  termsUrl?: string | null;
  authEnvVar?: string | null;
  pollIntervalMinutes?: number;

  // Only configured, reviewed HTTPS feed endpoints are accepted.
  feedUrl?: string;
  defaultOpportunityType?: OpportunityType;
  maxItemsPerRun?: number;
}

export type OpportunityDraft = Omit<
  Prisma.OpportunityUncheckedCreateInput,
  "id" | "createdById"
>;

export interface NormalizedOpportunitySourceItem {
  externalId: string;
  sourceUrl: string;
  canonicalUrl?: string | null;
  title: string;
  sourceStatus?: string | null;
  sourcePublishedAt?: Date | null;
  sourceUpdatedAt?: Date | null;
  contentHash?: string | null;
  metadata?: Prisma.InputJsonValue;
  opportunity: OpportunityDraft;
}

export interface OpportunitySourceFetchResult {
  items: NormalizedOpportunitySourceItem[];
  scanned: number;
  skipped?: number;
  failed?: number;
  totalAvailable?: number;
}

export interface OpportunitySourceImportResult {
  scanned: number;
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
  runId: string;
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
  totalAvailable?: number;
}
