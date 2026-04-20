import { prisma } from "./db";
import { credit, defaultExpiry } from "./points";

export async function activeRitualForUser(userId: string) {
  const now = new Date();
  const active = await prisma.ritual.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { startsAt: "desc" },
    include: { claims: { where: { userId }, take: 1 } },
  });
  if (!active) return null;
  return {
    id: active.id,
    title: active.title,
    body: active.body,
    trackTitle: active.trackTitle,
    trackUrl: active.trackUrl,
    artworkUrl: active.artworkUrl,
    startsAt: active.startsAt,
    endsAt: active.endsAt,
    pointsReward: active.pointsReward,
    claimed: active.claims.length > 0,
    reflection: active.claims[0]?.reflection ?? null,
  };
}

export async function claimRitual(
  userId: string,
  ritualId: string,
  reflection?: string | null
) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const ritual = await tx.ritual.findUnique({ where: { id: ritualId } });
    if (!ritual) throw new Error("not_found");
    if (ritual.startsAt > now || ritual.endsAt < now) throw new Error("not_open");

    const existing = await tx.ritualClaim.findUnique({
      where: { userId_ritualId: { userId, ritualId } },
    });
    if (existing) {
      if (reflection && reflection !== existing.reflection) {
        await tx.ritualClaim.update({
          where: { id: existing.id },
          data: { reflection },
        });
      }
      return { claim: existing, credited: false, pointsAwarded: 0 };
    }

    const claim = await tx.ritualClaim.create({
      data: { userId, ritualId, reflection: reflection ?? null },
    });

    await tx.pointTransaction.create({
      data: {
        userId,
        delta: ritual.pointsReward,
        reason: "ritual_claim",
        refId: `ritual:${ritualId}:${userId}`,
        expiresAt: defaultExpiry(),
      },
    });

    return { claim, credited: true, pointsAwarded: ritual.pointsReward };
  });
}
