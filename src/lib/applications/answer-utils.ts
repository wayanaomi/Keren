export const LEGACY_GENERATION_FAILURE_MESSAGE =
  "Keren could not generate a draft right now. Please try again.";

const NON_ANSWER_MESSAGES = [
  LEGACY_GENERATION_FAILURE_MESSAGE,
  "Keren could not generate a draft for this question.",
];

export function isUsableAnswer(
  value: string | null | undefined,
): value is string {
  const trimmed = value?.trim();

  return Boolean(
    trimmed &&
    !NON_ANSWER_MESSAGES.includes(trimmed) &&
    !trimmed.startsWith("AI drafting is not configured for this environment."),
  );
}

export function normalizeQuestionText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
