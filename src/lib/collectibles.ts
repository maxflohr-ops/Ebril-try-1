import { prisma } from "./db";

// Keys are string literals the rest of the app can import safely — keeps the
// codebase honest about which grants actually exist, without coupling to
// enum migrations.
export const COLLECTIBLE_KEYS = {
  welcome: "welcome_in",
  firstPledge: "first_pledge",
  firstRedeem: "first_redeem",
  firstRitual: "first_ritual",
  diaryStreak7: "diary_streak_7",
  diaryStreak30: "diary_streak_30",
  superfan: "tier_superfan",
  vip: "tier_vip",
  stranger: "stranger_in_you",
} as const;

export type CollectibleKey = (typeof COLLECTIBLE_KEYS)[keyof typeof COLLECTIBLE_KEYS];

interface GrantOpts {
  userId: string;
  key: CollectibleKey | string;
  reason?: string;
}

export async function grantCollectible(opts: GrantOpts): Promise<boolean> {
  const collectible = await prisma.collectible.findUnique({ where: { key: opts.key } });
  if (!collectible || !collectible.active) return false;

  try {
    await prisma.collectibleGrant.create({
      data: {
        userId: opts.userId,
        collectibleId: collectible.id,
        reason: opts.reason ?? null,
      },
    });
    return true;
  } catch {
    // unique constraint — already granted; idempotent no-op.
    return false;
  }
}

export async function getUserShelf(userId: string) {
  const [allCollectibles, grants] = await Promise.all([
    prisma.collectible.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.collectibleGrant.findMany({
      where: { userId },
      orderBy: { grantedAt: "desc" },
    }),
  ]);
  const grantMap = new Map(grants.map((g) => [g.collectibleId, g]));
  return allCollectibles.map((c) => ({
    id: c.id,
    key: c.key,
    name: c.name,
    flavor: c.flavor,
    tapeColor: c.tapeColor,
    labelColor: c.labelColor,
    rarity: c.rarity,
    granted: grantMap.has(c.id),
    grantedAt: grantMap.get(c.id)?.grantedAt ?? null,
    reason: grantMap.get(c.id)?.reason ?? null,
  }));
}
