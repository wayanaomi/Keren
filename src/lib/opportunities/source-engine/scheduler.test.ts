import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sourceFindFirst: vi.fn(),
  syncRegistry: vi.fn(),
  importGrantsGov: vi.fn(),
  importTed: vi.fn(),
  importTETFund: vi.fn(),
  importFeed: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    opportunitySource: {
      findFirst: mocks.sourceFindFirst,
    },
  },
}));

vi.mock("./dashboard", () => ({
  syncOpportunitySourceRegistry: mocks.syncRegistry,
}));

vi.mock("../sources/grants-gov", () => ({
  importGrantsGovOpportunities: mocks.importGrantsGov,
}));

vi.mock("../sources/ted", () => ({
  importTedOpportunities: mocks.importTed,
}));

vi.mock("../sources/tetfund", () => ({
  importTETFundOpportunities: mocks.importTETFund,
}));

vi.mock("./feeds", () => ({
  importFeedOpportunities: mocks.importFeed,
}));

import {
  runNextDueOpportunitySource,
} from "./scheduler";

const successResult = {
  scanned: 2,
  imported: 1,
  duplicates: 0,
  skipped: 1,
  failed: 0,
  runId: "scheduled-run-1",
  status: "SUCCEEDED" as const,
};

const enabledEnvironment = {
  VERCEL_ENV: "production",
  OPPORTUNITY_DISCOVERY_ENABLED: "true",
};

beforeEach(() => {
  vi.clearAllMocks();

  mocks.sourceFindFirst.mockResolvedValue(null);
  mocks.syncRegistry.mockResolvedValue(undefined);
  mocks.importGrantsGov.mockResolvedValue(successResult);
  mocks.importTed.mockResolvedValue(successResult);
  mocks.importTETFund.mockResolvedValue(successResult);
  mocks.importFeed.mockResolvedValue(successResult);
});

describe("runNextDueOpportunitySource", () => {
  it("never runs imports in Preview", async () => {
    const result = await runNextDueOpportunitySource({
      env: {
        VERCEL_ENV: "preview",
        OPPORTUNITY_DISCOVERY_ENABLED: "true",
      },
    });

    expect(result).toEqual({
      status: "DISABLED",
      reason: "preview-environment",
    });

    expect(mocks.syncRegistry).not.toHaveBeenCalled();
    expect(mocks.sourceFindFirst).not.toHaveBeenCalled();
  });

  it("requires the explicit enable flag", async () => {
    const result = await runNextDueOpportunitySource({
      env: { VERCEL_ENV: "production" },
    });

    expect(result).toEqual({
      status: "DISABLED",
      reason: "feature-flag-disabled",
    });

    expect(mocks.sourceFindFirst).not.toHaveBeenCalled();
  });

  it("returns idle when no enabled source is due", async () => {
    const result = await runNextDueOpportunitySource({
      env: enabledEnvironment,
    });

    expect(result).toEqual({ status: "IDLE" });
    expect(mocks.syncRegistry).toHaveBeenCalledOnce();
    expect(mocks.importGrantsGov).not.toHaveBeenCalled();
  });

  it("runs a due source using its scheduled importer", async () => {
    const now = new Date("2026-11-27T08:00:00.000Z");
    mocks.sourceFindFirst.mockResolvedValue({ key: "grants-gov" });

    const result = await runNextDueOpportunitySource({
      now,
      env: enabledEnvironment,
      executionId: "scheduler-test-1",
    });

    expect(mocks.sourceFindFirst).toHaveBeenCalledWith({
      where: {
        enabled: true,
        key: {
          in: [
            "grants-gov",
            "ted",
            "fcdo-international-development-funding",
            "ncair-opportunities",
            "tetfund-opportunities",
          ],
        },
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

    expect(mocks.importGrantsGov).toHaveBeenCalledWith(
      null,
      "SCHEDULED",
    );
    expect(mocks.importTed).not.toHaveBeenCalled();

    expect(result).toMatchObject({
      status: "COMPLETED",
      sourceKey: "grants-gov",
      importResult: successResult,
    });
  });

  it("dispatches feed sources through the feed connector", async () => {
    mocks.sourceFindFirst.mockResolvedValue({
      key: "ncair-opportunities",
    });

    const result = await runNextDueOpportunitySource({
      env: enabledEnvironment,
    });

    expect(mocks.importFeed).toHaveBeenCalledWith(
      null,
      "ncair-opportunities",
      "SCHEDULED",
    );

    expect(result).toMatchObject({
      status: "COMPLETED",
      sourceKey: "ncair-opportunities",
    });
  });

  it("reports connector failures in the scheduler result", async () => {
    mocks.sourceFindFirst.mockResolvedValue({ key: "grants-gov" });
    mocks.importGrantsGov.mockRejectedValue(
      new Error("Upstream API unavailable"),
    );

    const result = await runNextDueOpportunitySource({
      env: enabledEnvironment,
    });

    expect(result).toMatchObject({
      status: "FAILED",
      sourceKey: "grants-gov",
      error: "Upstream API unavailable",
    });
  });
});
