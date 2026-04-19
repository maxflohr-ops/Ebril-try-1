import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getBalance } from "@/lib/points";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/analytics";

const ShippingSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  region: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2),
});

const CreateSchema = z.object({
  rewardId: z.string().uuid(),
  shippingAddress: ShippingSchema.optional(),
});

const DIGITAL_TYPES = new Set(["content_unlock", "discount_code"]);

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const redemptions = await prisma.redemption.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: { reward: true },
  });
  return NextResponse.json({ redemptions });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const userId = session.userId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reward = await tx.reward.findUnique({ where: { id: parsed.data.rewardId } });
      if (!reward || !reward.active) throw new Error("reward_unavailable");
      if (reward.stock !== null && reward.stock <= 0) throw new Error("out_of_stock");

      if (reward.tierRequiredId) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { currentTierId: true, currentTier: { select: { sortOrder: true } } },
        });
        const requiredTier = await tx.tier.findUnique({
          where: { id: reward.tierRequiredId },
          select: { sortOrder: true },
        });
        if (
          !requiredTier ||
          !user?.currentTier ||
          user.currentTier.sortOrder < requiredTier.sortOrder
        ) {
          throw new Error("tier_locked");
        }
      }

      if (!DIGITAL_TYPES.has(reward.type) && !parsed.data.shippingAddress) {
        throw new Error("shipping_required");
      }

      const balance = await getBalance(userId, tx);
      if (balance < reward.costPoints) throw new Error("insufficient_points");

      const isDigital = DIGITAL_TYPES.has(reward.type);

      const redemption = await tx.redemption.create({
        data: {
          userId,
          rewardId: reward.id,
          costPoints: reward.costPoints,
          status: isDigital ? "approved" : "pending",
          shippingAddress: parsed.data.shippingAddress ?? undefined,
        },
      });

      await tx.pointTransaction.create({
        data: {
          userId,
          delta: -reward.costPoints,
          reason: "redemption",
          refId: redemption.id,
          expiresAt: null,
        },
      });

      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: reward.id },
          data: { stock: { decrement: 1 } },
        });
      }

      return { redemption, reward };
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true },
    });
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: `Redemption received: ${result.reward.name}`,
        text: `Hey ${user.displayName ?? "there"} — we got your redemption for ${result.reward.name} (${result.reward.costPoints} pts). ${
          result.redemption.status === "approved"
            ? "It's already unlocked in your account."
            : "You'll get another email once Ebril ships it."
        }`,
      });
    }

    await track(
      "redemption.created",
      {
        rewardId: result.reward.id,
        rewardType: result.reward.type,
        costPoints: result.reward.costPoints,
        autoApproved: result.redemption.status === "approved",
      },
      userId
    );

    return NextResponse.json({ redemption: result.redemption });
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    const status =
      message === "insufficient_points" ||
      message === "tier_locked" ||
      message === "out_of_stock" ||
      message === "shipping_required"
        ? 400
        : message === "reward_unavailable"
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
