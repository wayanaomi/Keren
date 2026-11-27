import { handleSchedule } from "@vercel/schedules";
import {
  runNextDueOpportunitySource,
} from "../src/lib/opportunities/source-engine/scheduler";

export const maxDuration = 60;

export const POST = handleSchedule(async (metadata) => {
  const result = await runNextDueOpportunitySource({
    executionId: metadata.executionId,
  });

  console.info("[Keren Discovery] Scheduler tick", {
    executionId: metadata.executionId,
    scheduledAt: metadata.scheduledAt.toISOString(),
    result,
  });
});
