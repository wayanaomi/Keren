import { OpportunityForm } from "../opportunity-form";
import { createOpportunityAction } from "../actions";

export default function NewOpportunityPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-xl font-bold text-ink">Add opportunity</h1>
      <OpportunityForm action={createOpportunityAction} />
    </div>
  );
}
