import { db } from "@/lib/db";
import type { OpportunityType, Prisma } from "@prisma/client";
import type { OpportunityFilterInput } from "@/lib/validators/opportunity";

export async function listOpportunities(filters: OpportunityFilterInput) {
  const where: Prisma.OpportunityWhereInput = {
    status: "PUBLISHED",
  };

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { funder: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { keywords: { has: filters.q.toLowerCase() } },
    ];
  }
  if (filters.country) {
    where.OR = [
      ...(where.OR ?? []),
      { country: { equals: filters.country, mode: "insensitive" } },
      { eligibleCountries: { has: filters.country } },
    ];
  }
  if (filters.sector) where.sector = { contains: filters.sector, mode: "insensitive" };
  if (filters.type) where.type = filters.type as OpportunityType;
  if (filters.fundingType) where.fundingType = { contains: filters.fundingType, mode: "insensitive" };
  if (filters.businessStage) where.businessStages = { has: filters.businessStage as never };
  if (filters.closingSoon) {
    const in14Days = new Date();
    in14Days.setDate(in14Days.getDate() + 14);
    where.deadline = { gte: new Date(), lte: in14Days };
  }

  const orderBy: Prisma.OpportunityOrderByWithRelationInput =
    filters.sort === "deadline"
      ? { deadline: "asc" }
      : filters.sort === "amount"
        ? { maxFunding: "desc" }
        : filters.sort === "recent"
          ? { createdAt: "desc" }
          : { createdAt: "desc" };

  return db.opportunity.findMany({ where, orderBy, take: 50 });
}

export async function getOpportunityById(id: string) {
  const opportunity = await db.opportunity.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!opportunity) return null;

  // Auto-expire: never present a passed deadline as still verified/open.
  if (opportunity.deadline && opportunity.deadline < new Date() && opportunity.verificationStatus !== "EXPIRED") {
    return db.opportunity.update({
      where: { id },
      data: { verificationStatus: "EXPIRED" },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  }

  return opportunity;
}

export async function expireOverdueOpportunities() {
  return db.opportunity.updateMany({
    where: { deadline: { lt: new Date() }, verificationStatus: { not: "EXPIRED" } },
    data: { verificationStatus: "EXPIRED" },
  });
}
