import { z } from "zod";

export const opportunitySchema = z.object({
  title: z.string().min(3),
  funder: z.string().min(2),
  type: z.enum([
    "GRANT",
    "TENDER",
    "RFP",
    "ACCELERATOR",
    "COMPETITION",
    "VC_FUNDING",
    "LOAN",
    "PROCUREMENT",
    "FELLOWSHIP",
    "PILOT",
    "OTHER",
  ]),
  description: z.string().min(10),

  country: z.string().optional().nullable(),
  eligibleCountries: z.array(z.string()).optional(),
  sector: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  applicantTypes: z.array(z.enum(["STARTUP", "SME", "NGO", "CONSULTANT", "INDIVIDUAL", "OTHER"])).optional(),
  businessStages: z
    .array(z.enum(["IDEA", "PROTOTYPE", "PRE_SEED", "SEED", "GROWTH", "SERIES_A_PLUS", "NEW", "EARLY", "ESTABLISHED"]))
    .optional(),

  fundingType: z.string().optional().nullable(),
  fundingAmount: z.coerce.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  minFunding: z.coerce.number().optional().nullable(),
  maxFunding: z.coerce.number().optional().nullable(),

  minRevenue: z.coerce.number().optional().nullable(),
  minEmployees: z.coerce.number().int().optional().nullable(),

  openingDate: z.coerce.date().optional().nullable(),
  deadline: z.coerce.date().optional().nullable(),

  applicationUrl: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  sourceName: z.string().optional().nullable(),

  eligibilityRequirements: z.array(z.string()).optional(),
  requiredDocuments: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),

  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  verificationStatus: z.enum(["VERIFIED", "NEEDS_VERIFICATION", "EXPIRED"]).optional(),
});

export type OpportunityInput = z.infer<typeof opportunitySchema>;

export const opportunityFilterSchema = z.object({
  q: z.string().optional(),
  country: z.string().optional(),
  sector: z.string().optional(),
  type: z.string().optional(),
  fundingType: z.string().optional(),
  businessStage: z.string().optional(),
  sort: z.enum(["relevance", "deadline", "amount", "match", "recent"]).optional(),
  closingSoon: z.coerce.boolean().optional(),
});

export type OpportunityFilterInput = z.infer<typeof opportunityFilterSchema>;
