import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const onboardingSchema = z.object({
  lookingFor: z.array(z.string()).min(1, "Select at least one option"),
  organizationName: z.string().min(2, "Enter your organization name"),
  organizationType: z.enum(["STARTUP", "SME", "NGO", "CONSULTANT", "INDIVIDUAL", "OTHER"]),
  country: z.string().min(2, "Select a country"),
  industry: z.string().min(2, "Enter your industry or sector"),
  businessStage: z.enum([
    "IDEA",
    "PROTOTYPE",
    "PRE_SEED",
    "SEED",
    "GROWTH",
    "SERIES_A_PLUS",
    "NEW",
    "EARLY",
    "ESTABLISHED",
  ]),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
