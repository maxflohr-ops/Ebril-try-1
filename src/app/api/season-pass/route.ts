import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Fan-facing view of the active season pass with the current fan's
 * submission status per reward.
 */
export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const now = new Date();
  const season = await prisma.seasonPass.findFirst({
    where: {
      active: true,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    include: {
      rewards: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!season) {
    return NextResponse.json({ season: null });
  }

  const [latestSubs, grants] = await Promise.all([
    prisma.seasonPassSubmission.findMany({
      where: {
        userId: session.userId,
        rewardId: { in: season.rewards.map((r) => r.id) },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.seasonPassGrant.findMany({
      where: {
        userId: session.userId,
        rewardId: { in: season.rewards.map((r) => r.id) },
      },
    }),
  ]);

  // Most recent submission per reward.
  const latestByReward = new Map<string, (typeof latestSubs)[number]>();
  for (const s of latestSubs) {
    if (!latestByReward.has(s.rewardId)) latestByReward.set(s.rewardId, s);
  }
  const grantedSet = new Set(grants.map((g) => g.rewardId));

  return NextResponse.json({
    season: {
      id: season.id,
      slug: season.slug,
      name: season.name,
      tagline: season.tagline,
      startsAt: season.startsAt.toISOString(),
      endsAt: season.endsAt.toISOString(),
      rewards: season.rewards.map((r) => {
        const sub = latestByReward.get(r.id) ?? null;
        return {
          id: r.id,
          key: r.key,
          name: r.name,
          description: r.description,
          kind: r.kind,
          imageUrl: r.imageUrl,
          minTierSortOrder: r.minTierSortOrder,
          submission: sub
            ? {
                id: sub.id,
                status: sub.status,
                contentType: sub.contentType,
                contentBody: sub.contentBody,
                reviewerNote: sub.reviewerNote,
                createdAt: sub.createdAt.toISOString(),
                decidedAt: sub.decidedAt?.toISOString() ?? null,
              }
            : null,
          granted: grantedSet.has(r.id),
        };
      }),
    },
  });
}
