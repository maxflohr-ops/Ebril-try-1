import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  city: z.string().min(1).max(80),
  venue: z.string().min(1).max(120),
  country: z.string().length(2).default("CA"),
  startsAt: z.string().datetime(),
  doorsAt: z.string().datetime().optional().nullable(),
  ticketUrl: z.string().url().optional().nullable(),
  noteFromEbril: z.string().max(800).optional().nullable(),
  pointsReward: z.number().int().min(0).max(10_000).default(100),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const dates = await prisma.tourDate.findMany({
    orderBy: { startsAt: "asc" },
    include: { _count: { select: { checkins: true } } },
  });
  return NextResponse.json({ dates });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = parsed.data;
  const date = await prisma.tourDate.create({
    data: {
      city: d.city,
      venue: d.venue,
      country: d.country.toUpperCase(),
      startsAt: new Date(d.startsAt),
      doorsAt: d.doorsAt ? new Date(d.doorsAt) : null,
      ticketUrl: d.ticketUrl ?? null,
      noteFromEbril: d.noteFromEbril ?? null,
      pointsReward: d.pointsReward,
    },
  });
  await logAudit(admin.userId, "tour.create", date.id, d);
  return NextResponse.json({ date });
}
