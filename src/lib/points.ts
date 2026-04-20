import { Prisma, PrismaClient, TransactionReason } from "@prisma/client";
import { prisma } from "./db";

export const POINTS_PER_DOLLAR = 10;
export const POINT_EXPIRY_MONTHS = 18;

type Tx = Prisma.TransactionClient | PrismaClient;

export async function getBalance(userId: string, client: Tx = prisma): Promise<number> {
  const now = new Date();
  const result = await client.pointTransaction.aggregate({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

export interface CreditInput {
  userId: string;
  amountCents: number;
  reason: TransactionReason;
  refId?: string;
  multiplier?: number;
  flatBonus?: number;
  expiresAt?: Date | null;
}

export function pointsForPledge(amountCents: number, multiplier = 1): number {
  return Math.floor((amountCents / 100) * POINTS_PER_DOLLAR * multiplier);
}

export function defaultExpiry(from = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + POINT_EXPIRY_MONTHS);
  return d;
}

export async function credit(input: CreditInput, client: Tx = prisma) {
  const base = pointsForPledge(input.amountCents, input.multiplier ?? 1);
  const delta = base + (input.flatBonus ?? 0);
  if (delta <= 0) return null;

  return client.pointTransaction.create({
    data: {
      userId: input.userId,
      delta,
      reason: input.reason,
      refId: input.refId,
      expiresAt: input.expiresAt === undefined ? defaultExpiry() : input.expiresAt,
    },
  });
}

