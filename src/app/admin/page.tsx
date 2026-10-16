import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  const [users, organizations, opportunities, applications, aiGenerations, aiFailures] = await Promise.all([
    db.user.count(),
    db.organization.count(),
    db.opportunity.count(),
    db.application.count(),
    db.aiGeneration.count(),
    db.aiGeneration.count({ where: { status: "FAILED" } }),
  ]);

  const stats = [
    { label: "Users", value: users },
    { label: "Organizations", value: organizations },
    { label: "Opportunities", value: opportunities },
    { label: "Applications", value: applications },
    { label: "AI generations", value: aiGenerations },
    { label: "AI failures", value: aiFailures },
  ];

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold text-ink">Overview</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs text-stone">{s.label}</p>
            <p className="text-2xl font-extrabold text-ink">{s.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
