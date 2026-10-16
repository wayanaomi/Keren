import OpenAI from "openai";

let client: OpenAI | null = null;

export function isAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAiClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("AI_NOT_CONFIGURED");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI_NOT_CONFIGURED");
    this.name = "AiNotConfiguredError";
  }
}
