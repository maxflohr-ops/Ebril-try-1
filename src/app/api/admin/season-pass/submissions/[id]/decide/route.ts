import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { sendPushToUser } from "@/lib/push";

const Schema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewerNote: z.string().max(500).nullable().optional(),
});

/**
 * Approve or reject a season-pass submission. On approve, write a
 * SeasonPassGrant (idempotent — second approval of the same submission
 * is a no-op). The plugin reads grants on login and runs the configured
 * console commands for the reward's key.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { decision, reviewerNote } = parsed.data;

  const submission = await prisma.seasonPassSubmission.findUnique({
    where: { id: params.id },
    include: { reward: { select: { id: true, name: true, key: true } } },
  });
  if (!submission) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (submission.status !== "pending") {
    return NextResponse.json({ error: "already_decided" }, { status: 409 });
  }

  if (decision === "approved") {
    await prisma.$transaction(async (tx) => {
      await tx.seasonPassSubmission.update({
        where: { id: submission.id },
        data: {
          status: "approved",
          reviewerNote: reviewerNote ?? null,
          decidedAt: new Date(),
          decidedBy: admin.userId,
        },
      });
      // Idempotent grant — (userId, rewardId) is unique. If a grant already
      // exists from an earlier submission, leave it alone.
      await tx.seasonPassGrant.upsert({
        where: {
          userId_rewardId: {
            userId: submission.userId,
            rewardId: submission.rewardId,
          },
        },
        create: {
          userId: submission.userId,
          rewardId: submission.rewardId,
          submissionId: submission.id,
          refId: `season:${submission.rewardId}:${submission.userId}`,
        },
        update: {},
      });
    });
  } else {
    await prisma.seasonPassSubmission.update({
      where: { id: submission.id },
      data: {
        status: "rejected",
        reviewerNote: reviewerNote ?? null,
        decidedAt: new Date(),
        decidedBy: admin.userId,
      },
    });
  }

  await logAudit(admin.userId, `season_pass.${decision}`, submission.id, {
    rewardId: submission.rewardId,
    rewardKey: submission.reward.key,
    targetUserId: submission.userId,
  });

  // Tell the fan (best-effort).
  await sendPushToUser(submission.userId, {
    title:
      decision === "approved"
        ? `${submission.reward.name} — approved`
        : `${submission.reward.name} — returned`,
    body:
      decision === "approved"
        ? "log into the server and your reward will land."
        : reviewerNote ?? "try a new submission when you're ready.",
    url: "/season-pass",
  });

  return NextResponse.json({ ok: true });
}
