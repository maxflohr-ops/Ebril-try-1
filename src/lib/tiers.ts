import { Tier } from "@prisma/client";
import { prisma } from "./db";
import { syncTierRoleSafe } from "./discordBot";

export interface TierProgress {
  current: Tier | null;
  next: Tier | null;
  qualifyingCentsPerMonth: number;
  progressPct: number;
}

export async function qualifyingMonthlyCents(userId: string): Promise<number> {
  const active = await prisma.pledge.findFirst({
    where: { userId, status: "active" },
    orderBy: { amountCents: "desc" },
  });
  return active?.amountCents ?? 0;
}

export async function getTierProgress(userId: string): Promise<TierProgress> {
  const [tiers, qualifying] = await Promise.all([
    prisma.tier.findMany({ orderBy: { sortOrder: "asc" } }),
    qualifyingMonthlyCents(userId),
  ]);

  let current: Tier | null = null;
  let next: Tier | null = null;
  for (const t of tiers) {
    if (qualifying >= t.thresholdCentsPerMonth) current = t;
    else {
      next = t;
      break;
    }
  }

  const floor = current?.thresholdCentsPerMonth ?? 0;
  const ceil = next?.thresholdCentsPerMonth ?? floor;
  const progressPct =
    ceil === floor ? 100 : Math.min(100, Math.round(((qualifying - floor) / (ceil - floor)) * 100));

  return { current, next, qualifyingCentsPerMonth: qualifying, progressPct };
}

export async function recalcUserTier(userId: string): Promise<Tier | null> {
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentTierId: true },
  });
  const { current } = await getTierProgress(userId);
  const newTierId = current?.id ?? null;

  if ((before?.currentTierId ?? null) !== newTierId) {
    await prisma.user.update({
      where: { id: userId },
      data: { currentTierId: newTierId },
    });
    // Tier actually moved → reconcile the fan's Discord role. Best-effort;
    // a Discord outage must never break a tier recalculation. No-op when
    // the bot isn't configured or the fan hasn't linked Discord.
    await syncTierRoleSafe(userId);
  }

  return current;
}
