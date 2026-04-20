import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";

const Schema = z.object({
  eraId: z.string().uuid(),
  songId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(160),
  slug: z.string().max(80).optional(),
  direction: z.string().min(1).max(4000),
  exampleUrl: z.string().url().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  platformHint: z.string().max(80).nullable().optional(),
  hashtagHint: z.string().max(80).nullable().optional(),
  pointsApproved: z.number().int().min(0).default(100),
  pointsFeatured: z.number().int().min(0).default(500),
  pointsViral: z.number().int().min(0).default(2500),
  viralThreshold: z.number().int().min(0).nullable().optional(),
  featuredCollectibleKey: z.string().max(60).nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const eraId = req.nextUrl.searchParams.get("eraId");
  const directions = await prisma.clippingBrief.findMany({
    where: eraId ? { eraId } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      era: { select: { name: true, accentColor: true, isCurrent: true, slug: true } },
      song: { select: { title: true, slug: true } },
      _count: { select: { clips: true } },
    },
  });
  return NextResponse.json({ directions });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const slug = parsed.data.slug?.trim() || slugify(parsed.data.title);

  if (parsed.data.pointsFeatured < parsed.data.pointsApproved) {
    return NextResponse.json({ error: "featured_must_exceed_approved" }, { status: 400 });
  }
  if (parsed.data.pointsViral < parsed.data.pointsFeatured) {
    return NextResponse.json({ error: "viral_must_exceed_featured" }, { status: 400 });
  }

  const direction = await prisma.clippingBrief.create({
    data: {
      eraId: parsed.data.eraId,
      songId: parsed.data.songId ?? null,
      title: parsed.data.title,
      slug,
      direction: parsed.data.direction,
      exampleUrl: parsed.data.exampleUrl ?? null,
      coverUrl: parsed.data.coverUrl ?? null,
      platformHint: parsed.data.platformHint ?? null,
      hashtagHint: parsed.data.hashtagHint ?? null,
      pointsApproved: parsed.data.pointsApproved,
      pointsFeatured: parsed.data.pointsFeatured,
      pointsViral: parsed.data.pointsViral,
      viralThreshold: parsed.data.viralThreshold ?? null,
      featuredCollectibleKey: parsed.data.featuredCollectibleKey ?? null,
      sortOrder: parsed.data.sortOrder,
    },
  });
  await logAudit(admin.userId, "direction.create", direction.id, parsed.data);
  return NextResponse.json({ direction });
}
