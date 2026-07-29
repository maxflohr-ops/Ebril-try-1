import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  trackTitle: z.string().max(200).nullish(),
  trackUrl: z.string().url().nullish(),
  artworkUrl: z.string().url().nullish(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  pointsReward: z.number().int().min(0).max(10_000).default(25),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rituals = await prisma.ritual.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { claims: true } } },
  });
  return NextResponse.json({ rituals });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) {
    return NextResponse.json({ error: "ends_before_starts" }, { status: 400 });
  }
  const ritual = await prisma.ritual.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      trackTitle: parsed.data.trackTitle ?? null,
      trackUrl: parsed.data.trackUrl ?? null,
      artworkUrl: parsed.data.artworkUrl ?? null,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      pointsReward: parsed.data.pointsReward,
    },
  });
  await logAudit(admin.userId, "ritual.create", ritual.id, parsed.data);
  return NextResponse.json({ ritual });
}
