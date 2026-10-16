import { AI_MODEL, getOpenAiClient, isAiConfigured } from "@/lib/ai/client";
import { db } from "@/lib/db";

export interface ApplicationWriterInput {
  organizationId: string;
  organizationFacts: Record<string, unknown>;
  opportunityTitle: string;
  opportunityFacts: Record<string, unknown>;
  question: string;
  instruction?: string; // e.g. "shorten", "expand", "change tone to formal"
  previousAnswer?: string;
}

export interface ApplicationWriterOutput {
  draftAnswer: string;
  sourceInformation: string[];
  missingInformation: string[];
}

const SYSTEM_PROMPT = `You are Keren's Application Writer.

INPUT: an organization's verified profile facts, an opportunity's verified facts, and one
application question.

ALLOWED INFORMATION: only the organizationFacts and opportunityFacts JSON provided in the
user message, plus any explicit instruction given. You may rephrase and structure this
information, but you must not invent revenue, funding, employee counts, dates, certifications,
customers, or any other fact not present in the provided JSON.

OUTPUT: respond with JSON: { "draftAnswer": string, "sourceInformation": string[],
"missingInformation": string[] }.
- "draftAnswer" answers the question using only allowed information, in clear plain English.
- "sourceInformation" lists which facts fields you drew on (e.g. "organization.description").
- "missingInformation" lists anything the question needs that was not present in the provided facts —
  phrase each as "Keren cannot determine X from the information provided."
- If you cannot answer meaningfully at all because almost nothing is known, say so plainly in
  draftAnswer and list the missing fields.
Never claim the application will succeed. Never fabricate.`;

export async function generateApplicationDraft(
  input: ApplicationWriterInput,
): Promise<ApplicationWriterOutput> {
  if (!isAiConfigured()) {
    return {
      draftAnswer:
        "AI drafting is not configured for this environment. Add OPENAI_API_KEY to enable draft generation.",
      sourceInformation: [],
      missingInformation: ["AI drafting is unavailable until an OpenAI API key is configured."],
    };
  }

  try {
    const client = getOpenAiClient();
    const response = await client.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            organizationFacts: input.organizationFacts,
            opportunity: { title: input.opportunityTitle, facts: input.opportunityFacts },
            question: input.question,
            instruction: input.instruction ?? null,
            previousAnswer: input.previousAnswer ?? null,
          }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = raw ? (JSON.parse(raw) as Partial<ApplicationWriterOutput>) : {};

    await db.aiGeneration.create({
      data: {
        organizationId: input.organizationId,
        service: "APPLICATION_WRITER",
        status: "SUCCESS",
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
      },
    });

    return {
      draftAnswer: parsed.draftAnswer || "Keren could not generate a draft for this question.",
      sourceInformation: parsed.sourceInformation ?? [],
      missingInformation: parsed.missingInformation ?? [],
    };
  } catch (error) {
    await db.aiGeneration.create({
      data: {
        organizationId: input.organizationId,
        service: "APPLICATION_WRITER",
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return {
      draftAnswer: "Keren could not generate a draft right now. Please try again.",
      sourceInformation: [],
      missingInformation: [],
    };
  }
}
