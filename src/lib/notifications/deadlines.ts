import { db } from "@/lib/db";
import { daysUntil } from "@/lib/utils";

const REMINDER_WINDOWS = [30, 14, 7, 3, 1];

export interface UpcomingDeadline {
  opportunityId: string;
  title: string;
  deadline: Date;
  daysLeft: number;
}

/**
 * Deadlines are computed live from saved opportunities and active applications rather than
 * a separate cron job — simpler and always consistent with current data for the MVP.
 */
export async function getUpcomingDeadlines(organizationId: string): Promise<UpcomingDeadline[]> {
  const [saved, applications] = await Promise.all([
    db.savedOpportunity.findMany({ where: { organizationId }, include: { opportunity: true } }),
    db.application.findMany({
      where: { organizationId, status: { notIn: ["WON", "REJECTED", "SUBMITTED"] } },
      include: { opportunity: true },
    }),
  ]);

  const seen = new Map<string, UpcomingDeadline>();

  for (const item of [...saved.map((s) => s.opportunity), ...applications.map((a) => a.opportunity)]) {
    if (!item.deadline) continue;
    const days = daysUntil(item.deadline);
    if (days === null || days < 0 || days > 30) continue;
    if (!REMINDER_WINDOWS.some((w) => days <= w)) continue;
    seen.set(item.id, { opportunityId: item.id, title: item.title, deadline: item.deadline, daysLeft: days });
  }

  return [...seen.values()].sort((a, b) => a.daysLeft - b.daysLeft);
}
