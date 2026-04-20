import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { track } from "@/lib/analytics";
import { checkUrlLiveness } from "@/lib/urlCheck";

const PLATFORMS = [
  "tiktok",
  "instagram_reel",
  "youtube_short",
  "youtube",
  "twitter",
  "bluesky",
  "other",
] as const;

const Schema = z.object({
  briefId: z.string().uuid(),
  platform: z.enum(PLATFORMS),
  url: z.string().url(),
  caption: z.string().max(1000).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const clips = await prisma.clip.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      brief: {
        select: {
          title: true,
          era: { select: { name: true, slug: true, accentColor: true } },
        },
      },
    },
  });
  return NextResponse.json({ clips });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // 5 submissions per 24h — enough for a day of iteration, but not a spam run.
  const limit = rateLimit(`clip:${session.userId}`, 5, 24 * 60 * 60 * 1000);
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
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const brief = await prisma.clippingBrief.findUnique({
    where: { id: parsed.data.briefId },
    select: { id: true, active: true, era: { select: { active: true } } },
  });
  if (!brief || !brief.active || !brief.era.active) {
    return NextResponse.json({ error: "not_open" }, { status: 400 });
  }

  // Soft dedupe: the same user posting the same URL twice probably means a
  // typo recovery; just return the existing row instead of duplicating.
  const existing = await prisma.clip.findFirst({
    where: { userId: session.userId, briefId: brief.id, url: parsed.data.url },
  });
  if (existing) return NextResponse.json({ clip: existing, duplicate: true });

  // Liveness check runs inline but doesn't gate creation — a fan should
  // always be able to submit, even if a CDN temporarily blocks our HEAD.
  const check = await checkUrlLiveness(parsed.data.url).catch(
    () => ({ status: "unknown" as const, statusCode: null })
  );

  const clip = await prisma.clip.create({
    data: {
      userId: session.userId,
      briefId: brief.id,
      platform: parsed.data.platform,
      url: parsed.data.url,
      caption: parsed.data.caption ?? null,
      urlStatus: check.status,
      urlStatusCode: check.statusCode,
      urlCheckedAt: new Date(),
    },
  });

  await track(
    "page.viewed",
    {
      kind: "clip.submitted",
      briefId: brief.id,
      platform: parsed.data.platform,
      urlStatus: check.status,
    },
    session.userId
  );

  return NextResponse.json({ clip });
}
