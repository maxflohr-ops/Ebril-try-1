import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { newLinkCode } from "@/lib/minecraft";
import { rateLimit } from "@/lib/ratelimit";

const CODE_TTL_MS = 10 * 60 * 1000;

/**
 * Fan-initiated: start or refresh a pairing code. The fan then types
 *   /copula link XXX-XXX
 * in-game, which triggers the plugin to call POST /api/minecraft/verify.
 *
 * If the fan already has an active, unconsumed code we return the same
 * one (re-showing it is less confusing than minting a new one and
 * leaving both live).
 */
export async function POST() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const limit = rateLimit(`mclink:${session.userId}`, 6, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": Math.ceil(limit.retryAfterMs / 1000).toString() } }
    );
  }

  const now = new Date();

  // Already linked? No need for a new code.
  const existing = await prisma.minecraftAccount.findUnique({
    where: { userId: session.userId },
  });
  if (existing) {
    return NextResponse.json({ alreadyLinked: true, mcUsername: existing.mcUsername });
  }

  // Re-use an unconsumed, unexpired code if one exists.
  const active = await prisma.minecraftLinkCode.findFirst({
    where: {
      userId: session.userId,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
  if (active) {
    return NextResponse.json({
      code: active.code,
      expiresAt: active.expiresAt,
    });
  }

  const code = newLinkCode();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
  await prisma.minecraftLinkCode.create({
    data: {
      userId: session.userId,
      code,
      expiresAt,
    },
  });

  return NextResponse.json({ code, expiresAt });
}
