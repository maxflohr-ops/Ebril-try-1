import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";

const Schema = z.object({
  songId: z.string().uuid().nullable().optional(),
  label: z.string().max(80).nullable().optional(),
});

// POST = subscribe; DELETE = unsubscribe. Scoped per (user, song) with song=null
// representing "anything next".
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const limit = rateLimit(`drop:${session.userId}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": Math.ceil(limit.retryAfterMs / 1000).toString() } }
    );
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // Use findFirst rather than the composite unique — Prisma's composite
  // unique lookups can't match on null values in Postgres, and the "anything
  // next" subscription uses songId=null.
  const existing = await prisma.dropSubscription.findFirst({
    where: { userId: session.userId, songId: parsed.data.songId ?? null },
  });
  if (existing) return NextResponse.json({ subscription: existing, already: true });

  const sub = await prisma.dropSubscription.create({
    data: {
      userId: session.userId,
      songId: parsed.data.songId ?? null,
      label: parsed.data.label ?? null,
    },
  });
  return NextResponse.json({ subscription: sub });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const songId = req.nextUrl.searchParams.get("songId");
  await prisma.dropSubscription
    .deleteMany({ where: { userId: session.userId, songId: songId ?? null } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const subs = await prisma.dropSubscription.findMany({
    where: { userId: session.userId },
  });
  return NextResponse.json({ subscriptions: subs });
}
