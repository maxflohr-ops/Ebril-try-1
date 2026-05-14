import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/slug";
import { logAudit } from "@/lib/audit";

const CreateSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).optional(),
  tagline: z.string().max(200).nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  active: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "ends_before_starts" }, { status: 400 });
  }

  const slug = slugify(data.slug ?? data.name);
  if (!slug) return NextResponse.json({ error: "invalid_slug" }, { status: 400 });

  try {
    const season = await prisma.$transaction(async (tx) => {
      if (data.active) {
        await tx.seasonPass.updateMany({
          where: { active: true },
          data: { active: false },
        });
      }
      return tx.seasonPass.create({
        data: {
          slug,
          name: data.name.trim(),
          tagline: data.tagline ?? null,
          startsAt,
          endsAt,
          active: data.active,
        },
      });
    });
    await logAudit(admin.userId, "season_pass.create", season.id, {
      slug,
      name: season.name,
    });
    return NextResponse.json(season);
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json({ error: "duplicate_slug" }, { status: 409 });
    }
    throw err;
  }
}
