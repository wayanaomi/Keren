import { runNextDueOpportunitySource } from "@/lib/opportunities/source-engine/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.OPPORTUNITY_DISCOVERY_INTERNAL_SECRET;

  if (!secret) {
    return Response.json(
      { ok: false, error: "Internal discovery secret is not configured." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | { executionId?: unknown }
    | null;

  const executionId =
    typeof payload?.executionId === "string"
      ? payload.executionId
      : null;

  try {
    const result = await runNextDueOpportunitySource({ executionId: executionId ?? undefined });

    return Response.json({ ok: true, result });
  } catch (error) {
    console.error("[Keren Discovery] Internal runner failed", error);

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Opportunity discovery failed.",
      },
      { status: 500 },
    );
  }
}
