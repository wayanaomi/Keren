import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  NormalizedOpportunitySourceItem,
  OpportunitySourceDefinition,
  OpportunitySourceFetchResult,
} from "./types";

const mocks = vi.hoisted(() => ({
  sourceUpsert: vi.fn(),
  sourceCreateRun: vi.fn(),
  sourceUpdate: vi.fn(),
  runUpdate: vi.fn(),
  itemFindUnique: vi.fn(),
  itemUpdate: vi.fn(),
  itemFindFirst: vi.fn(),
  itemCreate: vi.fn(),
  opportunityFindUnique: vi.fn(),
  opportunityFindFirst: vi.fn(),
  opportunityCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    opportunitySource: {
      upsert: mocks.sourceUpsert,
      update: mocks.sourceUpdate,
    },
    opportunitySourceRun: {
      create: mocks.sourceCreateRun,
      update: mocks.runUpdate,
    },
    $transaction: mocks.transaction,
  },
}));

import { runOpportunitySourceImport } from "./runner";

const txClient = {
  opportunitySource: {
    update: mocks.sourceUpdate,
  },
  opportunitySourceRun: {
    update: mocks.runUpdate,
  },
  opportunitySourceItem: {
    findUnique: mocks.itemFindUnique,
    update: mocks.itemUpdate,
    findFirst: mocks.itemFindFirst,
    create: mocks.itemCreate,
  },
  opportunity: {
    findUnique: mocks.opportunityFindUnique,
    findFirst: mocks.opportunityFindFirst,
    create: mocks.opportunityCreate,
  },
};

const source: OpportunitySourceDefinition = {
  key: "test-source",
  name: "Test Foundation",
  organization: "Test Foundation",
  category: "Grants",
  method: "API",
  websiteUrl: "https://foundation.example",
  listingUrl: "https://foundation.example/opportunities",
  pollIntervalMinutes: 1440,
};

function makeCandidate(
  overrides: Partial<NormalizedOpportunitySourceItem> = {},
): NormalizedOpportunitySourceItem {
  return {
    externalId: "notice-123",
    sourceUrl: "https://foundation.example/opportunities/123",
    canonicalUrl: "https://foundation.example/opportunities/123",
    title: "Small Business Grant",
    sourceStatus: "OPEN",
    opportunity: {
      title: "Small Business Grant",
      funder: "Test Foundation",
      type: "GRANT",
      description: "Funding for eligible small businesses.",
    },
    ...overrides,
  };
}

function mockFetchedItems(
  items: NormalizedOpportunitySourceItem[],
  overrides: Partial<OpportunitySourceFetchResult> = {},
): OpportunitySourceFetchResult {
  return {
    items,
    scanned: items.length,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.sourceUpsert.mockResolvedValue({ id: "source-1" });
  mocks.sourceCreateRun.mockResolvedValue({
    id: "run-1",
    startedAt: new Date("2026-11-19T09:00:00.000Z"),
  });

  mocks.sourceUpdate.mockResolvedValue({});
  mocks.runUpdate.mockResolvedValue({});

  mocks.itemFindUnique.mockResolvedValue(null);
  mocks.itemUpdate.mockResolvedValue({});
  mocks.itemFindFirst.mockResolvedValue(null);
  mocks.itemCreate.mockResolvedValue({ id: "source-item-1" });

  mocks.opportunityFindUnique.mockResolvedValue(null);
  mocks.opportunityFindFirst.mockResolvedValue(null);
  mocks.opportunityCreate.mockResolvedValue({ id: "opportunity-1" });

  mocks.transaction.mockImplementation(
    async (callback: (tx: typeof txClient) => Promise<unknown>) =>
      callback(txClient),
  );
});

describe("runOpportunitySourceImport", () => {
  it("creates a new draft opportunity and source item", async () => {
    const result = await runOpportunitySourceImport({
      source,
      adminUserId: "admin-1",
      fetchItems: async () => mockFetchedItems([makeCandidate()]),
    });

    expect(result).toMatchObject({
      scanned: 1,
      imported: 1,
      duplicates: 0,
      skipped: 0,
      failed: 0,
      runId: "run-1",
      status: "SUCCEEDED",
    });

    expect(mocks.opportunityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Small Business Grant",
        sourceName: "Test Foundation",
        sourceUrl: "https://foundation.example/opportunities/123",
        status: "DRAFT",
        verificationStatus: "NEEDS_VERIFICATION",
        createdById: "admin-1",
      }),
      select: { id: true },
    });

    expect(mocks.itemCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceId: "source-1",
        opportunityId: "opportunity-1",
        externalId: "notice-123",
      }),
    });

    expect(mocks.runUpdate).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({
        status: "SUCCEEDED",
        imported: 1,
        scanned: 1,
      }),
    });
  });

  it("does not recreate an item with an existing external ID", async () => {
    mocks.itemFindUnique.mockResolvedValue({ id: "existing-item" });

    const result = await runOpportunitySourceImport({
      source,
      adminUserId: "admin-1",
      fetchItems: async () => mockFetchedItems([makeCandidate()]),
    });

    expect(result.duplicates).toBe(1);
    expect(result.imported).toBe(0);
    expect(mocks.itemUpdate).toHaveBeenCalledWith({
      where: { id: "existing-item" },
      data: expect.objectContaining({
        lastSeenAt: expect.any(Date),
        title: "Small Business Grant",
      }),
    });
    expect(mocks.opportunityCreate).not.toHaveBeenCalled();
    expect(mocks.itemCreate).not.toHaveBeenCalled();
  });

  it("links a cross-source canonical URL duplicate to its existing opportunity", async () => {
    mocks.itemFindFirst.mockResolvedValue({
      opportunityId: "existing-opportunity",
    });
    mocks.opportunityFindUnique.mockResolvedValue({
      id: "existing-opportunity",
    });

    const result = await runOpportunitySourceImport({
      source: {
        ...source,
        key: "another-source",
        name: "Another Foundation",
      },
      adminUserId: "admin-1",
      fetchItems: async () => mockFetchedItems([makeCandidate({
        externalId: "different-source-id",
      })]),
    });

    expect(result.duplicates).toBe(1);
    expect(mocks.opportunityCreate).not.toHaveBeenCalled();

    expect(mocks.itemCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        opportunityId: "existing-opportunity",
        externalId: "different-source-id",
      }),
    });
  });

  it("records invalid source URLs as failed items", async () => {
    const result = await runOpportunitySourceImport({
      source,
      adminUserId: "admin-1",
      fetchItems: async () =>
        mockFetchedItems([
          makeCandidate({
            sourceUrl: "javascript:alert(1)",
          }),
        ]),
    });

    expect(result.failed).toBe(1);
    expect(result.imported).toBe(0);
    expect(result.status).toBe("FAILED");
    expect(mocks.opportunityCreate).not.toHaveBeenCalled();

    expect(mocks.runUpdate).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({
        status: "FAILED",
        failed: 1,
      }),
    });
  });

  it("records partial connector statistics correctly", async () => {
    const result = await runOpportunitySourceImport({
      source,
      adminUserId: "admin-1",
      fetchItems: async () =>
        mockFetchedItems([makeCandidate()], {
          scanned: 3,
          skipped: 1,
          failed: 1,
          totalAvailable: 50,
        }),
    });

    expect(result).toMatchObject({
      scanned: 3,
      imported: 1,
      skipped: 1,
      failed: 1,
      totalAvailable: 50,
      status: "PARTIAL",
    });

    expect(mocks.runUpdate).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({
        scanned: 3,
        imported: 1,
        skipped: 1,
        failed: 1,
        status: "PARTIAL",
      }),
    });
  });

  it("records a failed run when the connector itself throws", async () => {
    await expect(
      runOpportunitySourceImport({
        source,
        adminUserId: "admin-1",
        fetchItems: async () => {
          throw new Error("Upstream API unavailable");
        },
      }),
    ).rejects.toThrow("Upstream API unavailable");

    expect(mocks.runUpdate).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({
        status: "FAILED",
        failed: 1,
        errorSummary: "Upstream API unavailable",
      }),
    });

    expect(mocks.opportunityCreate).not.toHaveBeenCalled();
  });

    it("marks opportunities with explicit past deadlines as expired", async () => {
      const base = makeCandidate();
      const candidate = makeCandidate({
        opportunity: {
          ...base.opportunity,
          deadline: new Date("2000-01-01T00:00:00.000Z"),
        },
      });

      await runOpportunitySourceImport({
        source,
        adminUserId: "admin-1",
        fetchItems: async () => mockFetchedItems([candidate]),
      });

      expect(mocks.opportunityCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "DRAFT",
          verificationStatus: "EXPIRED",
        }),
        select: { id: true },
      });
    });

});
