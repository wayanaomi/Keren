import { requireOrganization } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/billing";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function BillingPage() {
  const { organization } = await requireOrganization();
  const [subscription, usage] = await Promise.all([
    db.subscription.findUnique({ where: { organizationId: organization.id } }),
    db.usage.findUnique({ where: { organizationId: organization.id } }),
  ]);

  const currentTier = subscription?.tier ?? "FREE";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-bold text-ink">Billing</h1>
      <p className="mb-5 text-sm text-stone">
        Current plan: <span className="font-semibold text-ink">{PLANS[currentTier].name}</span>
      </p>

      {usage && (
        <Card className="mb-5 p-4">
          <p className="text-sm font-semibold text-ink">This period&apos;s usage</p>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-stone">AI generations</p>
              <p className="font-bold text-ink">
                {usage.aiGenerationsUsed}
                {PLANS[currentTier].limits.aiGenerationsPerMonth
                  ? ` / ${PLANS[currentTier].limits.aiGenerationsPerMonth}`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-stone">Saved opportunities</p>
              <p className="font-bold text-ink">
                {usage.savedOpportunitiesUsed}
                {PLANS[currentTier].limits.savedOpportunities
                  ? ` / ${PLANS[currentTier].limits.savedOpportunities}`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-stone">Searches</p>
              <p className="font-bold text-ink">{usage.searchesUsed}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {Object.values(PLANS).map((plan) => (
          <Card key={plan.tier} className="flex flex-col p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink">{plan.name}</p>
              {plan.tier === currentTier && <Badge tone="orange">Current</Badge>}
            </div>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {plan.priceUsd === 0 ? "Free" : `$${plan.priceUsd}`}
              {plan.priceUsd > 0 && <span className="text-xs font-normal text-stone">/mo</span>}
            </p>
            <ul className="mt-3 flex-1 space-y-1 text-xs text-stone">
              {plan.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
            <Button size="sm" variant="secondary" className="mt-4" disabled={plan.tier === currentTier}>
              {plan.tier === currentTier ? "Current plan" : "Upgrade"}
            </Button>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-stone">
        Payment processing is not yet connected in this environment — upgrades will be enabled once a
        payment provider is configured.
      </p>
    </div>
  );
}
