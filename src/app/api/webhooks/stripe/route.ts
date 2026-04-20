import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe, webhookSecret } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIGITAL = new Set(["content_unlock", "discount_code"]);

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, webhookSecret());
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  try {
    await prisma.webhookEvent.create({
      data: { source: "stripe", externalId: event.id, payload: event as unknown as object },
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ ok: true, skipped: "unpaid" });
  }

  const record = await prisma.stripeCheckout.findUnique({ where: { sessionId: session.id } });
  if (!record || record.status === "fulfilled") {
    return NextResponse.json({ ok: true, skipped: "already_fulfilled" });
  }

  if (record.kind === "point_pack" && record.pointsDelta && record.pointsDelta > 0) {
    await prisma.$transaction(async (tx) => {
      const refId = `stripe:${session.id}`;
      const existing = await tx.pointTransaction.findFirst({
        where: { userId: record.userId, refId },
      });
      if (!existing) {
        await tx.pointTransaction.create({
          data: {
            userId: record.userId,
            delta: record.pointsDelta!,
            reason: "stripe_top_up",
            refId,
            expiresAt: null,
          },
        });
      }
      await tx.stripeCheckout.update({
        where: { id: record.id },
        data: { status: "fulfilled", fulfilledAt: new Date() },
      });
    });

    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { email: true, displayName: true },
    });
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: "points landed",
        text: `${record.pointsDelta.toLocaleString()} points are in your balance. thank you for being here.`,
      });
    }
    await sendPushToUser(record.userId, {
      title: "points landed",
      body: `${record.pointsDelta.toLocaleString()} points are yours.`,
      url: "/",
    });
    await track(
      "pledge.charged",
      { source: "stripe", amountCents: record.amountCents, points: record.pointsDelta },
      record.userId
    );

    return NextResponse.json({ ok: true, credited: record.pointsDelta });
  }

  if (record.kind === "reward_cash" && record.targetId) {
    const shippingRaw = session.metadata?.shipping;
    const shipping = shippingRaw ? JSON.parse(shippingRaw) : undefined;

    const { redemption } = await prisma.$transaction(async (tx) => {
      const reward = await tx.reward.findUnique({ where: { id: record.targetId! } });
      if (!reward) throw new Error("reward_missing");
      const isDigital = DIGITAL.has(reward.type);
      const created = await tx.redemption.create({
        data: {
          userId: record.userId,
          rewardId: reward.id,
          costPoints: 0,
          status: isDigital ? "approved" : "pending",
          shippingAddress: shipping,
          fulfillmentNotes: `Paid via Stripe ${session.id}`,
          stripeSessionId: session.id,
        },
      });
      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: reward.id },
          data: { stock: { decrement: 1 } },
        });
      }
      await tx.stripeCheckout.update({
        where: { id: record.id },
        data: { status: "fulfilled", fulfilledAt: new Date() },
      });
      return { redemption: created, reward };
    });

    await track(
      "redemption.created",
      { source: "stripe", rewardId: record.targetId, cashCents: record.amountCents },
      record.userId
    );

    return NextResponse.json({ ok: true, redemptionId: redemption.id });
  }

  return NextResponse.json({ ok: true, skipped: "unknown_kind" });
}
