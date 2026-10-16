"use client";

import { useActionState, useState } from "react";
import { KerenMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { completeOnboardingAction, type OnboardingState } from "./actions";

const LOOKING_FOR_OPTIONS = ["Grants", "Tenders", "RFPs", "Accelerators", "Competitions", "Investors", "Other funding"];

const ORG_TYPES = [
  { value: "STARTUP", label: "Startup" },
  { value: "SME", label: "SME" },
  { value: "NGO", label: "NGO" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "OTHER", label: "Other" },
];

const STAGES = [
  { value: "IDEA", label: "Idea" },
  { value: "PROTOTYPE", label: "Prototype" },
  { value: "PRE_SEED", label: "Pre-seed" },
  { value: "SEED", label: "Seed" },
  { value: "GROWTH", label: "Growth" },
  { value: "SERIES_A_PLUS", label: "Series A+" },
  { value: "NEW", label: "New business" },
  { value: "EARLY", label: "Early stage" },
  { value: "ESTABLISHED", label: "Established" },
];

const STEPS = ["Looking for", "Organization", "Country", "Industry", "Stage"];

const initialState: OnboardingState = {};

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("STARTUP");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessStage, setBusinessStage] = useState("SEED");
  const [state, formAction, pending] = useActionState(completeOnboardingAction, initialState);

  const canAdvance = [
    lookingFor.length > 0,
    organizationName.trim().length > 1,
    country.trim().length > 1,
    industry.trim().length > 1,
    true,
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-8 flex items-center justify-center gap-2">
        <KerenMark className="h-7 w-7" />
      </div>

      <div className="mb-6 flex gap-1.5">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-orange" : "bg-line")}
          />
        ))}
      </div>

      <form action={formAction}>
        <input type="hidden" name="organizationName" value={organizationName} />
        <input type="hidden" name="organizationType" value={organizationType} />
        <input type="hidden" name="country" value={country} />
        <input type="hidden" name="industry" value={industry} />
        <input type="hidden" name="businessStage" value={businessStage} />
        {lookingFor.map((v) => (
          <input key={v} type="hidden" name="lookingFor" value={v} />
        ))}

        {step === 0 && (
          <Step title="What are you looking for?" subtitle="Select everything that applies.">
            <div className="grid grid-cols-2 gap-2">
              {LOOKING_FOR_OPTIONS.map((opt) => {
                const checked = lookingFor.includes(opt);
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() =>
                      setLookingFor((prev) => (checked ? prev.filter((v) => v !== opt) : [...prev, opt]))
                    }
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                      checked ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step title="Tell us about your organization" subtitle="You can refine this later in your profile.">
            <Label htmlFor="org-name">Organization name</Label>
            <Input id="org-name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
            <div className="mt-4">
              <Label htmlFor="org-type">Organization type</Label>
              <Select id="org-type" value={organizationType} onChange={(e) => setOrganizationType(e.target.value)}>
                {ORG_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step title="Where are you based?" subtitle="Used to match country-eligible opportunities.">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Nigeria" />
          </Step>
        )}

        {step === 3 && (
          <Step title="What industry or sector are you in?" subtitle="Used to match sector-specific opportunities.">
            <Label htmlFor="industry">Industry / sector</Label>
            <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Fintech" />
          </Step>
        )}

        {step === 4 && (
          <Step title="What stage are you at?" subtitle="Used to match stage-eligible opportunities.">
            <Select value={businessStage} onChange={(e) => setBusinessStage(e.target.value)}>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Step>
        )}

        {state.error && <p className="mt-4 text-sm text-danger">{state.error}</p>}

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="flex-1"
              disabled={!canAdvance[step]}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Setting up your workspace…" : "Finish setup"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-lg font-bold text-ink">{title}</h1>
      <p className="mb-5 text-sm text-stone">{subtitle}</p>
      {children}
    </div>
  );
}
