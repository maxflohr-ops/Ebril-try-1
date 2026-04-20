import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { claimRitual } from "@/lib/rituals";
import { prisma } from "@/lib/db";
import { COLLECTIBLE_KEYS, grantCollectible } from "@/lib/collectibles";
import { rateLimit } from "@/lib/ratelimit";

const Schema = z.object({
  reflection: z.string().max(1000).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const limit = rateLimit(`ritual:${session.userId}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": Math.ceil(limit.retryAfterMs / 1000).toString() } }
    );
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    const result = await claimRitual(
      session.userId,
      params.id,
      parsed.data.reflection ?? null
    );
    if (result.credited) {
      const priorClaims = await prisma.ritualClaim.count({
        where: { userId: session.userId, id: { not: result.claim.id } },
      });
      if (priorClaims === 0) {
        await grantCollectible({
          userId: session.userId,
          key: COLLECTIBLE_KEYS.firstRitual,
          reason: "first ritual",
        });
      }
    }
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    const status = msg === "not_found" ? 404 : msg === "not_open" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
