"use client";

import { useActionState } from "react";
import type { Organization } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { updateOrganizationAction, type OrgActionState } from "./actions";

const ORG_TYPES = ["STARTUP", "SME", "NGO", "CONSULTANT", "INDIVIDUAL", "OTHER"];
const STAGES = ["IDEA", "PROTOTYPE", "PRE_SEED", "SEED", "GROWTH", "SERIES_A_PLUS", "NEW", "EARLY", "ESTABLISHED"];

const initialState: OrgActionState = {};

export function OrganizationProfileForm({ organization }: { organization: Organization }) {
  const [state, formAction, pending] = useActionState(updateOrganizationAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <Section title="Basic">
        <Field label="Organization name">
          <Input name="name" defaultValue={organization.name} required />
        </Field>
        <Field label="Website">
          <Input name="website" defaultValue={organization.website ?? ""} placeholder="https://" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Country">
            <Input name="country" defaultValue={organization.country ?? ""} />
          </Field>
          <Field label="City">
            <Input name="city" defaultValue={organization.city ?? ""} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Organization type">
            <Select name="type" defaultValue={organization.type}>
              {ORG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Founded year">
            <Input name="foundedYear" type="number" defaultValue={organization.foundedYear ?? ""} />
          </Field>
        </div>
        <Field label="Industry">
          <Input name="industry" defaultValue={organization.industry ?? ""} />
        </Field>
        <Field label="Description">
          <Textarea name="description" defaultValue={organization.description ?? ""} />
        </Field>
      </Section>

      <Section title="Business">
        <Field label="Business model">
          <Textarea name="businessModel" defaultValue={organization.businessModel ?? ""} />
        </Field>
        <Field label="Products / services">
          <Textarea name="productsServices" defaultValue={organization.productsServices ?? ""} />
        </Field>
        <Field label="Target customers">
          <Textarea name="targetCustomers" defaultValue={organization.targetCustomers ?? ""} />
        </Field>
        <Field label="Markets served (comma-separated)">
          <Input name="marketsServed" defaultValue={organization.marketsServed.join(", ")} />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Revenue range">
            <Input name="revenueRange" defaultValue={organization.revenueRange ?? ""} />
          </Field>
          <Field label="Employee count">
            <Input name="employeeCount" type="number" defaultValue={organization.employeeCount ?? ""} />
          </Field>
          <Field label="Annual turnover (USD)">
            <Input name="annualTurnover" type="number" defaultValue={organization.annualTurnover ?? ""} />
          </Field>
        </div>
      </Section>

      <Section title="Funding">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Current funding stage">
            <Select name="fundingStage" defaultValue={organization.fundingStage ?? ""}>
              <option value="">Not set</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Business stage">
            <Select name="businessStage" defaultValue={organization.businessStage ?? ""}>
              <option value="">Not set</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Previous funding">
          <Textarea name="previousFunding" defaultValue={organization.previousFunding ?? ""} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount raised (USD)">
            <Input name="amountRaised" type="number" defaultValue={organization.amountRaised ?? ""} />
          </Field>
          <Field label="Funding required (USD)">
            <Input name="fundingRequired" type="number" defaultValue={organization.fundingRequired ?? ""} />
          </Field>
        </div>
        <Field label="Preferred funding type">
          <Input name="preferredFundingType" defaultValue={organization.preferredFundingType ?? ""} />
        </Field>
      </Section>

      <Section title="Impact">
        <Field label="Social impact">
          <Textarea name="socialImpact" defaultValue={organization.socialImpact ?? ""} />
        </Field>
        <Field label="Environmental impact">
          <Textarea name="environmentalImpact" defaultValue={organization.environmentalImpact ?? ""} />
        </Field>
        <Field label="SDGs (comma-separated)">
          <Input name="sdgs" defaultValue={organization.sdgs.join(", ")} />
        </Field>
        <Field label="Beneficiaries">
          <Textarea name="beneficiaries" defaultValue={organization.beneficiaries ?? ""} />
        </Field>
        <Field label="Geographic impact (comma-separated)">
          <Input name="geographicImpact" defaultValue={organization.geographicImpact.join(", ")} />
        </Field>
      </Section>

      <Section title="Capabilities">
        <Field label="Services (comma-separated)">
          <Input name="services" defaultValue={organization.services.join(", ")} />
        </Field>
        <Field label="Certifications (comma-separated)">
          <Input name="certifications" defaultValue={organization.certifications.join(", ")} />
        </Field>
        <Field label="Previous contracts">
          <Textarea name="previousContracts" defaultValue={organization.previousContracts ?? ""} />
        </Field>
        <Field label="Previous projects">
          <Textarea name="previousProjects" defaultValue={organization.previousProjects ?? ""} />
        </Field>
        <Field label="Areas of expertise (comma-separated)">
          <Input name="areasOfExpertise" defaultValue={organization.areasOfExpertise.join(", ")} />
        </Field>
      </Section>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-verified">Profile saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone">{title}</h2>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
