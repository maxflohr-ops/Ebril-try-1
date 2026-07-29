import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";

type Tx = Prisma.TransactionClient | PrismaClient;

export const STREAK_REWARDS: Record<number, number> = {
  3: 100,
  6: 250,
  12: 500,
};

export const REFERRAL_BONUS = 500;
export const BIRTHDAY_BONUS = 500;

export async function consecutiveChargeMonths(
  userId: string,
  client: Tx = prisma
): Promise<number> {
  const charges = await client.pointTransaction.findMany({
    where: { userId, reason: "pledge_charge" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
    take: 36,
  });
  if (charges.length === 0) return 0;

  const months = new Set<string>();
  for (const c of charges) {
    months.add(`${c.createdAt.getUTCFullYear()}-${c.createdAt.getUTCMonth()}`);
  }

  const now = new Date();
  let streak = 0;
  let cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  while (true) {
    const key = `${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}`;
    if (!months.has(key)) {
      if (streak === 0) {
        cursor.setUTCMonth(cursor.getUTCMonth() - 1);
        continue;
      }
      break;
    }
    streak++;
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
    if (streak > 36) break;
  }
  return streak;
}
