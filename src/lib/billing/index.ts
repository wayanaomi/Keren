import type { PlanTier } from "@prisma/client";

/**
 * Billing abstraction. Payment providers (Paystack initially, Stripe later) implement
 * PaymentProvider so call sites never talk to a vendor SDK directly.
 */

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  priceUsd: number;
  limits: {
    savedOpportunities: number | null; // null = unlimited
    aiGenerationsPerMonth: number | null;
  };
  features: string[];
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  FREE: {
    tier: "FREE",
    name: "Free",
    priceUsd: 0,
    limits: { savedOpportunities: 10, aiGenerationsPerMonth: 5 },
    features: ["Limited opportunity searches", "Limited saved opportunities", "Limited AI generations"],
  },
  PRO: {
    tier: "PRO",
    name: "Pro",
    priceUsd: 25,
    limits: { savedOpportunities: null, aiGenerationsPerMonth: 200 },
    features: ["Unlimited opportunity discovery", "AI matching", "AI application assistant", "Document uploads", "Deadline alerts"],
  },
  BUSINESS: {
    tier: "BUSINESS",
    name: "Business",
    priceUsd: 45,
    limits: { savedOpportunities: null, aiGenerationsPerMonth: 600 },
    features: ["Multiple users", "Multiple organizations", "Advanced AI", "Team collaboration"],
  },
  CONSULTANT: {
    tier: "CONSULTANT",
    name: "Consultant",
    priceUsd: 65,
    limits: { savedOpportunities: null, aiGenerationsPerMonth: 1500 },
    features: ["Multiple clients", "Client workspaces", "Reporting"],
  },
};

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(params: {
    organizationId: string;
    tier: PlanTier;
    customerEmail: string;
  }): Promise<{ checkoutUrl: string }>;
}

class UnconfiguredPaymentProvider implements PaymentProvider {
  readonly name = "none";
  async createCheckoutSession(): Promise<{ checkoutUrl: string }> {
    throw new Error("No payment provider is configured. Set PAYMENTS_PROVIDER.");
  }
}

export function getPaymentProvider(): PaymentProvider {
  // A PaystackProvider implementing PaymentProvider can be added here once
  // PAYSTACK_SECRET_KEY is available, without changing any call sites.
  return new UnconfiguredPaymentProvider();
}

export function withinLimit(used: number, limit: number | null): boolean {
  if (limit === null) return true;
  return used < limit;
}
