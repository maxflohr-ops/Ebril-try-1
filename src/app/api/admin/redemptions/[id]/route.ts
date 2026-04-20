import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { track } from "@/lib/analytics";
import { stripe } from "@/lib/stripe";

const PatchSchema = z.object({
  status: z.enum(["approved", "shipped", "delivered", "cancelled"]),
  fulfillmentNotes: z.string().max(2000).optional(),
});

function subjectFor(status: string, rewardName: string) {
  const n = rewardName.toLowerCase();
  if (status === "shipped") return `${n} is on the way`;
  if (status === "delivered") return `${n} should be with you`;
  if (status === "cancelled") return "small mix-up — your points are back";
  return `a note about ${n}`;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const { status, fulfillmentNotes } = parsed.data;

  const redemption = await prisma.$transaction(async (tx) => {
    const r = await tx.redemption.findUnique({
      where: { id: params.id },
      include: { reward: true, user: true },
    });
    if (!r) throw new Error("not_found");

    if (status === "cancelled" && r.status !== "cancelled") {
      const existingReversal = await tx.pointTransaction.findFirst({
        where: { userId: r.userId, refId: r.id, reason: "manual_adjust", delta: { gt: 0 } },
      });
      if (!existingReversal) {
        await tx.pointTransaction.create({
          data: {
            userId: r.userId,
            delta: r.costPoints,
            reason: "manual_adjust",
            refId: r.id,
            expiresAt: null,
          },
        });
      }
      if (r.reward.stock !== null) {
        await tx.reward.update({
          where: { id: r.rewardId },
          data: { stock: { increment: 1 } },
        });
      }
    }

    return tx.redemption.update({
      where: { id: r.id },
      data: {
        status,
        fulfillmentNotes: fulfillmentNotes ?? r.fulfillmentNotes,
      },
      include: { reward: true, user: true },
    });
  });

  await logAudit(admin.userId, `redemption.${status}`, redemption.id, { fulfillmentNotes });

  // If we just cancelled a cash-paid redemption, refund the Stripe charge.
  // Best-effort: failure here does NOT undo the cancel — we log and surface
  // to the admin so they can reconcile manually via the Stripe dashboard.
  let refundWarning: string | null = null;
  if (
    status === "cancelled" &&
    redemption.stripeSessionId &&
    !redemption.stripeRefundId
  ) {
    try {
      const s = await stripe().checkout.sessions.retrieve(redemption.stripeSessionId, {
        expand: ["payment_intent"],
      });
      const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      if (!pi) {
        refundWarning = "stripe session had no payment_intent to refund";
      } else {
        const refund = await stripe().refunds.create({
          payment_intent: pi,
          reason: "requested_by_customer",
          metadata: { redemptionId: redemption.id },
        });
        await prisma.redemption.update({
          where: { id: redemption.id },
          data: { stripeRefundId: refund.id },
        });
        await logAudit(admin.userId, "redemption.stripe_refunded", redemption.id, {
          refundId: refund.id,
          amount: refund.amount,
        });
      }
    } catch (err) {
      refundWarning =
        err instanceof Error ? `stripe refund failed: ${err.message}` : "stripe refund failed";
      console.error("[stripe refund]", err);
    }
  }

  const subject = subjectFor(status, redemption.reward.name);

  if (redemption.user.email) {
    await sendEmail({
      to: redemption.user.email,
      subject,
      text:
        status === "cancelled"
          ? `small mix-up with your ${redemption.reward.name.toLowerCase()} — the ${redemption.costPoints} points are back in your balance, no harm done.`
          : status === "shipped"
            ? `it's on the way to you.${fulfillmentNotes ? `\n\n${fulfillmentNotes}` : ""}`
            : status === "delivered"
              ? `should be with you by now. hope it feels the way it's supposed to.${fulfillmentNotes ? `\n\n${fulfillmentNotes}` : ""}`
              : `a quick note: ${status}.${fulfillmentNotes ? `\n\n${fulfillmentNotes}` : ""}`,
    });
  }

  await sendPushToUser(redemption.userId, {
    title: subject,
    body:
      status === "cancelled"
        ? "your points are back."
        : status === "shipped"
          ? "it's on the way."
          : status === "delivered"
            ? "should be with you."
            : `status: ${status}.`,
    url: "/redemptions",
  });

  await track(
    "redemption.status_changed",
    { redemptionId: redemption.id, status },
    redemption.userId
  );

  return NextResponse.json({ redemption, refundWarning });
}
