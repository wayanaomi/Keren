import { AI_MODEL, getOpenAiClient, isAiConfigured } from "@/lib/ai/client";
import type { MatchResult } from "@/lib/matching/engine";
import { db } from "@/lib/db";

/**
 * Opportunity Matcher explanation service.
 *
 * INPUT: a MatchResult already computed deterministically by lib/matching/engine.
 * SOURCE OF TRUTH: only the matched/blocker/missing lists already produced by the engine.
 * ALLOWED INFORMATION: nothing outside those three lists — the model is explicitly told
 *   not to introduce new facts, figures, or eligibility claims.
 * OUTPUT: a short plain-language paragraph.
 * MISSING INFORMATION BEHAVIOR: summarized as-is, never guessed at.
 * FAILURE BEHAVIOR: falls back to a deterministic, template-built explanation (no LLM call)
 *   so the feature degrades gracefully without an API key or on API failure.
 */
export async function explainMatch(
  result: MatchResult,
  context: { opportunityTitle: string; organizationId?: string },
): Promise<string> {
  const fallback = buildTemplateExplanation(result);

  if (!isAiConfigured()) return fallback;

  try {
    const client = getOpenAiClient();
    const response = await client.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "You explain a pre-calculated opportunity match result in 2-4 short sentences. " +
            "Use ONLY the matched requirements, potential blockers and missing information provided. " +
            "Never invent facts, figures or eligibility claims. Never state or imply an outcome will be won. " +
            "Write in plain, calm, sentence-case English.",
        },
        {
          role: "user",
          content: JSON.stringify({
            opportunity: context.opportunityTitle,
            score: result.score,
            matchedRequirements: result.matchedRequirements,
            potentialBlockers: result.potentialBlockers,
            missingInformation: result.missingInformation,
          }),
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();

    if (context.organizationId) {
      await db.aiGeneration.create({
        data: {
          organizationId: context.organizationId,
          service: "MATCHER_EXPLANATION",
          status: "SUCCESS",
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
        },
      });
    }

    return text || fallback;
  } catch (error) {
    if (context.organizationId) {
      await db.aiGeneration.create({
        data: {
          organizationId: context.organizationId,
          service: "MATCHER_EXPLANATION",
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
    return fallback;
  }
}

function buildTemplateExplanation(result: MatchResult): string {
  const parts: string[] = [];
  if (result.matchedRequirements.length > 0) {
    parts.push(`${result.matchedRequirements.length} requirement(s) matched.`);
  }
  if (result.potentialBlockers.length > 0) {
    parts.push(`Potential issue: ${result.potentialBlockers[0]}`);
  }
  if (result.missingInformation.length > 0) {
    parts.push(`Keren cannot confirm ${result.missingInformation.length} item(s) from your profile.`);
  }
  return parts.join(" ") || "No eligibility signals were found for this opportunity.";
}
