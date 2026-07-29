import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { appBaseUrl, stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const ShippingSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  region: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2),
});

const Schema = z.object({
  rewardId: z.string().uuid(),
  shippingAddress: ShippingSchema.optional(),
});

const DIGITAL = new Set(["content_unlock", "discount_code"]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const limit = rateLimit(`checkout:${session.userId}`, 5, 10_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: limit.retryAfterMs },
      {
        status: 429,
        headers: { "retry-after": Math.ceil(limit.retryAfterMs / 1000).toString() },
      }
    );
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const reward = await prisma.reward.findUnique({ where: { id: parsed.data.rewardId } });
  if (!reward || !reward.active) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!reward.cashPriceCents)
    return NextResponse.json({ error: "cash_not_available" }, { status: 400 });
  if (reward.stock !== null && reward.stock <= 0)
    return NextResponse.json({ error: "out_of_stock" }, { status: 400 });
  if (!DIGITAL.has(reward.type) && !parsed.data.shippingAddress)
    return NextResponse.json({ error: "shipping_required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  const base = appBaseUrl();
  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user?.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: reward.cashPriceCents,
          product_data: {
            name: reward.name,
            description: reward.description,
            images: reward.imageUrl ? [reward.imageUrl] : undefined,
          },
        },
      },
    ],
    success_url: `${base}/redemptions?success=1`,
    cancel_url: `${base}/rewards?canceled=1`,
    metadata: {
      kind: "reward_cash",
      userId: session.userId,
      rewardId: reward.id,
      shipping: parsed.data.shippingAddress ? JSON.stringify(parsed.data.shippingAddress) : "",
    },
  });

  await prisma.stripeCheckout.create({
    data: {
      userId: session.userId,
      sessionId: checkout.id,
      kind: "reward_cash",
      targetId: reward.id,
      amountCents: reward.cashPriceCents,
      pointsDelta: 0,
    },
  });

  return NextResponse.json({ url: checkout.url });
}
