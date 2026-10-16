import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { OpportunityForm } from "../../opportunity-form";
import { updateOpportunityAction } from "../../actions";

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await db.opportunity.findUnique({ where: { id } });
  if (!opportunity) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-xl font-bold text-ink">Edit opportunity</h1>
      <OpportunityForm opportunity={opportunity} action={updateOpportunityAction.bind(null, id)} />
    </div>
  );
}
