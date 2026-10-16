import { requireOrganization } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getUpcomingDeadlines } from "@/lib/notifications/deadlines";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferencesAction } from "./actions";

export default async function NotificationsPage() {
  const { organization } = await requireOrganization();

  const [deadlines, preferences, notifications] = await Promise.all([
    getUpcomingDeadlines(organization.id),
    db.notificationPreference.findUnique({ where: { organizationId: organization.id } }),
    db.notification.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Notifications</h1>
        <p className="text-sm text-stone">Deadline reminders and account activity.</p>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Upcoming deadlines</h2>
        {deadlines.length === 0 ? (
          <EmptyState title="No upcoming deadlines" body="Save opportunities or start applications to see deadlines here." />
        ) : (
          <ul className="space-y-2">
            {deadlines.map((d) => (
              <li key={d.opportunityId} className="flex items-center justify-between border-b border-line py-2 text-sm">
                <span className="text-ink">{d.title}</span>
                <span className="font-semibold text-ember">
                  {formatDate(d.deadline)} · {d.daysLeft} day(s) left
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Activity</h2>
        {notifications.length === 0 ? (
          <EmptyState title="No notifications yet" body="You're all caught up." />
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className="border-b border-line py-2 text-sm">
                <p className="font-semibold text-ink">{n.title}</p>
                <p className="text-stone">{n.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Reminder settings</h2>
        <form action={updateNotificationPreferencesAction} className="space-y-3">
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {[
              ["remind30d", "30d"],
              ["remind14d", "14d"],
              ["remind7d", "7d"],
              ["remind3d", "3d"],
              ["remind24h", "24h"],
            ].map(([name, label]) => (
              <label key={name} className="flex flex-col items-center gap-1 rounded-md border border-line p-2">
                <input type="checkbox" name={name} defaultChecked={preferences?.[name as keyof typeof preferences] !== false} />
                {label}
              </label>
            ))}
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="emailEnabled" defaultChecked={preferences?.emailEnabled !== false} /> Email
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="inAppEnabled" defaultChecked={preferences?.inAppEnabled !== false} /> In-app
            </label>
          </div>
          <Button type="submit" size="sm">
            Save preferences
          </Button>
        </form>
      </Card>
    </div>
  );
}
