import { handleSchedule } from "@vercel/schedules";

export const maxDuration = 60;

export const POST = handleSchedule(async (metadata) => {
  const secret = process.env.OPPORTUNITY_DISCOVERY_INTERNAL_SECRET;

  if (!secret) {
    throw new Error("OPPORTUNITY_DISCOVERY_INTERNAL_SECRET is not configured.");
  }

  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "keren.chopute.com";

  const origin = host.startsWith("http") ? host : `https://${host}`;

  const response = await fetch(
    `${origin}/api/internal/opportunity-discovery`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        executionId: metadata.executionId,
      }),
      signal: AbortSignal.timeout(50_000),
    },
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Opportunity engine returned HTTP ${response.status}: ${responseText.slice(0, 1200)}`,
    );
  }

  let result: unknown = responseText;

  try {
    result = JSON.parse(responseText);
  } catch {
    // Keep the response text for diagnostics.
  }

  console.info("[Keren Discovery] Scheduler tick", {
    executionId: metadata.executionId,
    scheduledAt: metadata.scheduledAt.toISOString(),
    result,
  });
});
