import { requireOrganization } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { computeProfileCompleteness } from "@/lib/organization/context";
import { OrganizationProfileForm } from "./organization-form";
import { FoundersSection } from "./founders-section";

export default async function OrganizationProfilePage() {
  const { organization } = await requireOrganization();
  const founders = await db.founder.findMany({ where: { organizationId: organization.id } });
  const completeness = computeProfileCompleteness(organization);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Organization profile</h1>
          <p className="text-sm text-stone">Keren reuses this information across matching and applications.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-ink">{completeness}%</p>
          <p className="text-xs text-stone">complete</p>
        </div>
      </div>

      <div className="space-y-6">
        <OrganizationProfileForm organization={organization} />
        <FoundersSection founders={founders} />
      </div>
    </div>
  );
}
