import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { appBaseUrl, stripe } from "@/lib/stripe";

export const runtime = "nodejs";

const Schema = z.object({ packId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const pack = await prisma.pointPack.findUnique({ where: { id: parsed.data.packId } });
  if (!pack || !pack.active) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
          currency: pack.currency.toLowerCase(),
          unit_amount: pack.priceCents,
          product_data: {
            name: pack.name,
            description: `${pack.points.toLocaleString()} Ebril Rewards points`,
          },
        },
      },
    ],
    success_url: `${base}/points/buy?success=1`,
    cancel_url: `${base}/points/buy?canceled=1`,
    metadata: {
      kind: "point_pack",
      userId: session.userId,
      packId: pack.id,
      points: String(pack.points),
    },
  });

  await prisma.stripeCheckout.create({
    data: {
      userId: session.userId,
      sessionId: checkout.id,
      kind: "point_pack",
      targetId: pack.id,
      amountCents: pack.priceCents,
      pointsDelta: pack.points,
    },
  });

  return NextResponse.json({ url: checkout.url });
}
