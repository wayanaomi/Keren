"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spark } from "@/components/brand/marks";
import { generateDraftAction, saveFinalAnswerAction } from "@/app/app/applications/actions";
import type { ApplicationAnswer } from "@prisma/client";

const INSTRUCTIONS = [
  { label: "Shorten", value: "Shorten this answer." },
  { label: "Expand", value: "Expand this answer with more detail." },
  { label: "Improve", value: "Improve the clarity and quality of this answer." },
  { label: "Formal tone", value: "Rewrite in a more formal tone." },
];

export function AnswerCard({ answer }: { answer: ApplicationAnswer }) {
  const [draft, setDraft] = useState(answer.finalAnswer ?? answer.draftAnswer ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function generate(instruction?: string) {
    startTransition(async () => {
      await generateDraftAction(answer.id, instruction);
      window.location.reload();
    });
  }

  function save() {
    startTransition(async () => {
      await saveFinalAnswerAction(answer.id, draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <h3 className="text-sm font-bold text-ink">{answer.questionText}</h3>

      {answer.aiGenerated && (
        <p className="mt-2 flex items-center gap-1.5 rounded-md bg-orange-tint px-2.5 py-1.5 text-xs font-medium text-ember">
          <Spark className="h-3 w-3" /> AI-generated draft — review before submission.
        </p>
      )}

      <Textarea
        className="mt-3 min-h-32"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="No draft yet. Click Generate draft to begin."
      />

      {answer.missingInformation.length > 0 && (
        <div className="mt-2 rounded-md border border-warn/30 bg-warn/5 p-2.5 text-xs text-ink">
          <p className="font-semibold">Missing information</p>
          <ul className="list-disc pl-4">
            {answer.missingInformation.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => generate()} disabled={pending}>
          {pending ? "Generating…" : answer.draftAnswer ? "Regenerate" : "Generate draft"}
        </Button>
        {INSTRUCTIONS.map((i) => (
          <Button key={i.label} size="sm" variant="secondary" disabled={pending} onClick={() => generate(i.value)}>
            {i.label}
          </Button>
        ))}
        <Button size="sm" variant="dark" onClick={save} disabled={pending}>
          {saved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}
