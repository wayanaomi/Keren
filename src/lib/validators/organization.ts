import { z } from "zod";

export const organizationProfileSchema = z.object({
  // Basic
  name: z.string().min(2),
  website: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  type: z.enum(["STARTUP", "SME", "NGO", "CONSULTANT", "INDIVIDUAL", "OTHER"]),
  foundedYear: z.coerce.number().int().optional().nullable(),
  industry: z.string().optional().nullable(),
  description: z.string().optional().nullable(),

  // Business
  businessModel: z.string().optional().nullable(),
  productsServices: z.string().optional().nullable(),
  targetCustomers: z.string().optional().nullable(),
  marketsServed: z.array(z.string()).optional(),
  revenueRange: z.string().optional().nullable(),
  employeeCount: z.coerce.number().int().optional().nullable(),
  annualTurnover: z.coerce.number().optional().nullable(),

  // Funding
  fundingStage: z
    .enum(["IDEA", "PROTOTYPE", "PRE_SEED", "SEED", "GROWTH", "SERIES_A_PLUS", "NEW", "EARLY", "ESTABLISHED"])
    .optional()
    .nullable(),
  previousFunding: z.string().optional().nullable(),
  amountRaised: z.coerce.number().optional().nullable(),
  fundingRequired: z.coerce.number().optional().nullable(),
  preferredFundingType: z.string().optional().nullable(),

  // Impact
  socialImpact: z.string().optional().nullable(),
  environmentalImpact: z.string().optional().nullable(),
  sdgs: z.array(z.string()).optional(),
  beneficiaries: z.string().optional().nullable(),
  geographicImpact: z.array(z.string()).optional(),

  // Capabilities
  services: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  previousContracts: z.string().optional().nullable(),
  previousProjects: z.string().optional().nullable(),
  areasOfExpertise: z.array(z.string()).optional(),

  businessStage: z
    .enum(["IDEA", "PROTOTYPE", "PRE_SEED", "SEED", "GROWTH", "SERIES_A_PLUS", "NEW", "EARLY", "ESTABLISHED"])
    .optional()
    .nullable(),
});

export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>;

export const founderSchema = z.object({
  name: z.string().min(2),
  role: z.string().optional().nullable(),
  experience: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});

export type FounderInput = z.infer<typeof founderSchema>;
