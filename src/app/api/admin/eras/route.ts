import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";

const Schema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().max(80).optional(),
  tagline: z.string().max(200).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  artworkUrl: z.string().url().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isCurrent: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const eras = await prisma.era.findMany({
    orderBy: [{ active: "desc" }, { isCurrent: "desc" }, { sortOrder: "asc" }],
    include: { _count: { select: { directions: true } } },
  });
  return NextResponse.json({ eras });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);

  // Only one era can be current at a time — flip any existing current ones off.
  const era = await prisma.$transaction(async (tx) => {
    if (parsed.data.isCurrent) {
      await tx.era.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }
    return tx.era.create({
      data: {
        name: parsed.data.name,
        slug,
        tagline: parsed.data.tagline ?? null,
        description: parsed.data.description ?? null,
        accentColor: parsed.data.accentColor ?? "#D89B7A",
        secondaryColor: parsed.data.secondaryColor ?? "#6B4A5E",
        artworkUrl: parsed.data.artworkUrl ?? null,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        isCurrent: parsed.data.isCurrent,
        sortOrder: parsed.data.sortOrder,
      },
    });
  });

  await logAudit(admin.userId, "era.create", era.id, parsed.data);
  return NextResponse.json({ era });
}
