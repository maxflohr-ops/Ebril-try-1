import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getBalance } from "@/lib/points";
import { rateLimit } from "@/lib/ratelimit";
import { sendPushToUser } from "@/lib/push";
import { logAudit } from "@/lib/audit";

const MIN_GIFT = 100;
const MAX_GIFT = 10_000;

const Schema = z.object({
  toReferralCode: z.string().min(4).max(80),
  amount: z.number().int().min(MIN_GIFT).max(MAX_GIFT),
  note: z.string().max(300).optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const [sent, received] = await Promise.all([
    prisma.gift.findMany({
      where: { fromUserId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.gift.findMany({
      where: { toUserId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);
  const otherIds = Array.from(
    new Set([...sent.map((g) => g.toUserId), ...received.map((g) => g.fromUserId)])
  );
  const others = await prisma.user.findMany({
    where: { id: { in: otherIds } },
    select: { id: true, displayName: true, avatarUrl: true, referralCode: true },
  });
  const oMap = new Map(others.map((o) => [o.id, o]));

  return NextResponse.json({
    sent: sent.map((g) => ({
      id: g.id,
      amount: g.amount,
      note: g.note,
      createdAt: g.createdAt,
      to: oMap.get(g.toUserId) ?? null,
    })),
    received: received.map((g) => ({
      id: g.id,
      amount: g.amount,
      note: g.note,
      createdAt: g.createdAt,
      from: oMap.get(g.fromUserId) ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // 3 gifts per 24h per sender — sets a social tempo and makes gifts feel
  // intentional rather than farmable.
  const limit = rateLimit(`gift:${session.userId}`, 3, 24 * 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": Math.ceil(limit.retryAfterMs / 1000).toString() } }
    );
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { toReferralCode, amount, note } = parsed.data;

  const recipient = await prisma.user.findUnique({
    where: { referralCode: toReferralCode.trim() },
    select: { id: true, displayName: true, email: true },
  });
  if (!recipient) {
    return NextResponse.json({ error: "recipient_not_found" }, { status: 404 });
  }
  if (recipient.id === session.userId) {
    return NextResponse.json({ error: "self_gift" }, { status: 400 });
  }

  // Sender must have the points and can't drain more than 50% of their
  // balance in a single gift — gifting is a community moment, not a
  // bank run.
  const senderBalance = await getBalance(session.userId);
  if (amount > senderBalance) {
    return NextResponse.json(
      { error: "insufficient_balance", balance: senderBalance },
      { status: 400 }
    );
  }
  const cap = Math.floor(senderBalance * 0.5);
  if (amount > cap && senderBalance >= MIN_GIFT * 2) {
    return NextResponse.json(
      { error: "gift_cap_exceeded", cap },
      { status: 400 }
    );
  }

  // Single transaction: paired ledger rows + the Gift record. refIds are
  // stable and paired so the ledger is self-documenting.
  const gift = await prisma.$transaction(async (tx) => {
    const created = await tx.gift.create({
      data: {
        fromUserId: session.userId!,
        toUserId: recipient.id,
        amount,
        note: note?.trim() || null,
      },
    });
    await tx.pointTransaction.create({
      data: {
        userId: session.userId!,
        delta: -amount,
        reason: "gift_sent",
        refId: `gift:out:${created.id}`,
        expiresAt: null,
      },
    });
    await tx.pointTransaction.create({
      data: {
        userId: recipient.id,
        delta: amount,
        reason: "gift_received",
        refId: `gift:in:${created.id}`,
        expiresAt: null,
      },
    });
    return created;
  });

  await logAudit(session.userId, "gift.sent", gift.id, {
    toUserId: recipient.id,
    amount,
  });

  await sendPushToUser(recipient.id, {
    title: "someone sent you something",
    body: note ? `+${amount} pts · "${note.slice(0, 60)}"` : `+${amount} pts, with warmth.`,
    url: "/profile",
  });

  return NextResponse.json({ gift });
}
