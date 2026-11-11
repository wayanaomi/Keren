"use client";

import { useActionState, useState } from "react";
import type { Opportunity } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AdminActionState } from "./actions";

const TYPES = ["GRANT", "TENDER", "RFP", "ACCELERATOR", "COMPETITION", "VC_FUNDING", "LOAN", "PROCUREMENT", "FELLOWSHIP", "PILOT", "OTHER"];
const ORG_TYPES = ["STARTUP", "SME", "NGO", "CONSULTANT", "INDIVIDUAL", "OTHER"];
const STAGES = ["IDEA", "PROTOTYPE", "PRE_SEED", "SEED", "GROWTH", "SERIES_A_PLUS", "NEW", "EARLY", "ESTABLISHED"];

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

type QuestionTemplateInput = {
  id: string;
  question: string;
  helpText: string | null;
  maxWords: number | null;
  order: number;
};

type QuestionRow = {
  id: string;
  question: string;
  helpText: string;
  maxWords: string;
};

export function OpportunityForm({
  opportunity,
  questions: initialQuestions = [],
  action,
}: {
  opportunity?: Opportunity;
  questions?: QuestionTemplateInput[];
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [questionRows, setQuestionRows] = useState<QuestionRow[]>(() =>
    initialQuestions.map((question) => ({
      id: question.id,
      question: question.question,
      helpText: question.helpText ?? "",
      maxWords: question.maxWords?.toString() ?? "",
    }))
  );

  return (
    <form action={formAction} className="space-y-6">
      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Title">
            <Input name="title" defaultValue={opportunity?.title} required />
          </Field>
          <Field label="Funder">
            <Input name="funder" defaultValue={opportunity?.funder} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select name="type" defaultValue={opportunity?.type ?? "GRANT"}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={opportunity?.status ?? "PUBLISHED"}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </Field>
        </div>
        <Field label="Description">
          <Textarea name="description" defaultValue={opportunity?.description} required className="min-h-32" />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone">Eligibility</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Country (primary)">
            <Input name="country" defaultValue={opportunity?.country ?? ""} />
          </Field>
          <Field label="Eligible countries (comma-separated)">
            <Input name="eligibleCountries" defaultValue={opportunity?.eligibleCountries.join(", ") ?? ""} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sector">
            <Input name="sector" defaultValue={opportunity?.sector ?? ""} />
          </Field>
          <Field label="Industry">
            <Input name="industry" defaultValue={opportunity?.industry ?? ""} />
          </Field>
        </div>
        <Field label="Applicant types">
          <div className="flex flex-wrap gap-3">
            {ORG_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="applicantTypes"
                  value={t}
                  defaultChecked={opportunity?.applicantTypes.includes(t as never)}
                />
                {t}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Business stages">
          <div className="flex flex-wrap gap-3">
            {STAGES.map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="businessStages"
                  value={s}
                  defaultChecked={opportunity?.businessStages.includes(s as never)}
                />
                {s}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Eligibility requirements (one per line)">
          <Textarea name="eligibilityRequirements" defaultValue={opportunity?.eligibilityRequirements.join("\n") ?? ""} />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone">Funding</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Funding type">
            <Input name="fundingType" defaultValue={opportunity?.fundingType ?? ""} />
          </Field>
          <Field label="Currency">
            <Input name="currency" defaultValue={opportunity?.currency ?? "USD"} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Min funding">
            <Input name="minFunding" type="number" defaultValue={opportunity?.minFunding ?? ""} />
          </Field>
          <Field label="Max funding">
            <Input name="maxFunding" type="number" defaultValue={opportunity?.maxFunding ?? ""} />
          </Field>
          <Field label="Min revenue requirement">
            <Input name="minRevenue" type="number" defaultValue={opportunity?.minRevenue ?? ""} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone">Dates & links</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Opening date">
            <Input name="openingDate" type="date" defaultValue={toDateInputValue(opportunity?.openingDate ?? null)} />
          </Field>
          <Field label="Deadline">
            <Input name="deadline" type="date" defaultValue={toDateInputValue(opportunity?.deadline ?? null)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Application URL">
            <Input name="applicationUrl" defaultValue={opportunity?.applicationUrl ?? ""} />
          </Field>
          <Field label="Source URL">
            <Input name="sourceUrl" defaultValue={opportunity?.sourceUrl ?? ""} />
          </Field>
        </div>
        <Field label="Source name">
          <Input name="sourceName" defaultValue={opportunity?.sourceName ?? ""} />
        </Field>
        <Field label="Required documents (one per line)">
          <Textarea name="requiredDocuments" defaultValue={opportunity?.requiredDocuments.join("\n") ?? ""} />
        </Field>
        <Field label="Keywords (comma-separated)">
          <Input name="keywords" defaultValue={opportunity?.keywords.join(", ") ?? ""} />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone">
              Application questions
            </h2>
            <p className="mt-1 text-sm text-stone">
              Add questions from the funder's official application form. These
              become individual workspace items for users and can be answered
              with Keren's AI assistant.
            </p>
          </div>
          <span className="shrink-0 text-xs text-stone">
            {questionRows.length} questions
          </span>
        </div>

        {questionRows.length === 0 && (
          <div className="rounded-md border border-dashed border-line p-4 text-sm text-stone">
            No application questions have been added. Add verified questions
            from the official funder application form.
          </div>
        )}

        {questionRows.map((question, index) => (
          <div
            key={index}
            className="space-y-3 rounded-md border border-line p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">
                Question {index + 1}
              </h3>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  setQuestionRows((current) =>
                    current.filter((_, rowIndex) => rowIndex !== index)
                  )
                }
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>

            <input
              type="hidden"
              name="questionId"
              value={question.id}
            />

            <Field label="Question text">
              <Textarea
                name="question"
                required
                value={question.question}
                onChange={(event) =>
                  setQuestionRows((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index
                        ? { ...row, question: event.target.value }
                        : row
                    )
                  )
                }
                placeholder="Enter the exact question from the official application form."
                className="min-h-20"
              />
            </Field>

            <Field label="Help text / guidance (optional)">
              <Textarea
                name="questionHelpText"
                value={question.helpText}
                onChange={(event) =>
                  setQuestionRows((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index
                        ? { ...row, helpText: event.target.value }
                        : row
                    )
                  )
                }
                placeholder="Include official instructions or guidance supplied by the funder."
              />
            </Field>

            <Field label="Maximum words (optional)">
              <Input
                name="questionMaxWords"
                type="number"
                min="1"
                max="10000"
                step="1"
                value={question.maxWords}
                onChange={(event) =>
                  setQuestionRows((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index
                        ? { ...row, maxWords: event.target.value }
                        : row
                    )
                  )
                }
                placeholder="e.g. 500"
              />
            </Field>
          </div>
        ))}

        <button
          type="button"
          disabled={pending || questionRows.length >= 100}
          onClick={() =>
            setQuestionRows((current) => [
              ...current,
              { id: "", question: "", helpText: "", maxWords: "" },
            ])
          }
          className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-stone-50 disabled:opacity-50"
        >
          + Add application question
        </button>
      </Card>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : opportunity ? "Save changes" : "Create opportunity"}
      </Button>
    </form>
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
