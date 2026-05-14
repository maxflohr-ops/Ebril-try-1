import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { guardOutboundUrl } from "@/lib/netGuard";
import { logAudit } from "@/lib/audit";

const Schema = z.discriminatedUnion("contentType", [
  z.object({
    rewardId: z.string().uuid(),
    contentType: z.literal("url"),
    contentBody: z.string().url().max(600),
  }),
  z.object({
    rewardId: z.string().uuid(),
    contentType: z.literal("text"),
    contentBody: z.string().min(8).max(2000),
  }),
]);

/**
 * Fan-side: submit content for a season-pass reward. The fan must have a
 * pending or no current submission for that reward (rejected counts as
 * no current — they can resubmit). Already-granted rewards are sealed.
 *
 * URL submissions are passed through guardOutboundUrl so attackers can't
 * point us at internal hosts when an admin clicks the link. The link is
 * not fetched server-side.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const limit = rateLimit(`sp-submit:${session.userId}`, 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "slow_down", retryAfterMs: limit.retryAfterMs },
      { status: 429 }
    );
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  if (data.contentType === "url") {
    const guard = await guardOutboundUrl(data.contentBody);
    if (!guard.ok) {
      return NextResponse.json({ error: "bad_url" }, { status: 400 });
    }
  }

  const reward = await prisma.seasonPassReward.findUnique({
    where: { id: data.rewardId },
    include: {
      season: { select: { active: true, startsAt: true, endsAt: true } },
    },
  });
  if (!reward) return NextResponse.json({ error: "reward_not_found" }, { status: 404 });

  const now = new Date();
  if (!reward.season.active || reward.season.startsAt > now || reward.season.endsAt <= now) {
    return NextResponse.json({ error: "season_not_active" }, { status: 400 });
  }

  if (reward.minTierSortOrder > 0) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { currentTier: { select: { sortOrder: true } } },
    });
    const tier = user?.currentTier?.sortOrder ?? 0;
    if (tier < reward.minTierSortOrder) {
      return NextResponse.json({ error: "tier_too_low" }, { status: 403 });
    }
  }

  const existingGrant = await prisma.seasonPassGrant.findUnique({
    where: { userId_rewardId: { userId: session.userId, rewardId: reward.id } },
  });
  if (existingGrant) {
    return NextResponse.json({ error: "already_granted" }, { status: 409 });
  }

  const openSubmission = await prisma.seasonPassSubmission.findFirst({
    where: { userId: session.userId, rewardId: reward.id, status: "pending" },
  });
  if (openSubmission) {
    return NextResponse.json({ error: "submission_pending" }, { status: 409 });
  }

  const submission = await prisma.seasonPassSubmission.create({
    data: {
      userId: session.userId,
      rewardId: reward.id,
      contentType: data.contentType,
      contentBody: data.contentBody.trim(),
      status: "pending",
    },
  });

  await logAudit(session.userId, "season_pass.submit", submission.id, {
    rewardId: reward.id,
    rewardKey: reward.key,
    contentType: data.contentType,
  });

  return NextResponse.json({ ok: true, submissionId: submission.id });
}
