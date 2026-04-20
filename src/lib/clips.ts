import { ClipStatus } from "@prisma/client";
import { prisma } from "./db";
import { credit, defaultExpiry } from "./points";
import { grantCollectible } from "./collectibles";

// Tiered reward ladder: approved → featured → viral. Points are credited as
// deltas so a fan who goes straight from pending → viral gets the full viral
// amount, and a fan who goes pending → approved → featured → viral gets the
// same cumulative total.
const RANK: Record<ClipStatus, number> = {
  pending: 0,
  rejected: 0,
  approved: 1,
  featured: 2,
  viral: 3,
};

export function shouldCreditDelta(previous: ClipStatus, next: ClipStatus): boolean {
  return RANK[next] > RANK[previous];
}

export interface MovedClip {
  id: string;
  userId: string;
  status: ClipStatus;
  previousStatus: ClipStatus;
  pointsDelta: number;
  totalAwarded: number;
}

export async function moveClipStatus(
  clipId: string,
  nextStatus: ClipStatus,
  reviewerUserId: string,
  adminNotes?: string | null,
  rejectedReason?: string | null
): Promise<MovedClip> {
  return prisma.$transaction(async (tx) => {
    const clip = await tx.clip.findUnique({
      where: { id: clipId },
      include: { brief: true },
    });
    if (!clip) throw new Error("not_found");

    const prev = clip.status;
    if (prev === nextStatus) {
      return {
        id: clip.id,
        userId: clip.userId,
        status: clip.status,
        previousStatus: prev,
        pointsDelta: 0,
        totalAwarded: clip.pointsAwarded,
      };
    }

    let targetTotal: number;
    switch (nextStatus) {
      case "approved":
        targetTotal = clip.brief.pointsApproved;
        break;
      case "featured":
        targetTotal = clip.brief.pointsFeatured;
        break;
      case "viral":
        targetTotal = clip.brief.pointsViral;
        break;
      case "rejected":
        targetTotal = 0;
        break;
      default:
        targetTotal = clip.pointsAwarded;
    }

    const delta = targetTotal - clip.pointsAwarded;

    const updated = await tx.clip.update({
      where: { id: clipId },
      data: {
        status: nextStatus,
        reviewedById: reviewerUserId,
        reviewedAt: new Date(),
        pointsAwarded: targetTotal,
        adminNotes: adminNotes ?? clip.adminNotes,
        rejectedReason: nextStatus === "rejected" ? rejectedReason ?? clip.rejectedReason : null,
        featuredAt: nextStatus === "featured" && !clip.featuredAt ? new Date() : clip.featuredAt,
        viralAt: nextStatus === "viral" && !clip.viralAt ? new Date() : clip.viralAt,
      },
    });

    if (delta > 0) {
      await tx.pointTransaction.create({
        data: {
          userId: clip.userId,
          delta,
          reason: "clip_approved",
          refId: `clip:${clip.id}:${nextStatus}`,
          expiresAt: defaultExpiry(),
        },
      });
    } else if (delta < 0) {
      // status regressed (e.g. admin walks featured back to approved). Reverse
      // the prior grant so the ledger stays truthful.
      await tx.pointTransaction.create({
        data: {
          userId: clip.userId,
          delta,
          reason: "clip_approved",
          refId: `clip:${clip.id}:${nextStatus}:reversal`,
          expiresAt: null,
        },
      });
    }

    return {
      id: updated.id,
      userId: updated.userId,
      status: updated.status,
      previousStatus: prev,
      pointsDelta: delta,
      totalAwarded: updated.pointsAwarded,
    };
  });
}

export async function maybeGrantFeaturedCollectible(clipId: string) {
  const clip = await prisma.clip.findUnique({
    where: { id: clipId },
    include: { brief: true },
  });
  if (!clip || !clip.brief.featuredCollectibleKey) return;
  if (clip.status !== "featured" && clip.status !== "viral") return;
  await grantCollectible({
    userId: clip.userId,
    key: clip.brief.featuredCollectibleKey,
    reason: `featured clip: ${clip.brief.title}`,
  });
}
