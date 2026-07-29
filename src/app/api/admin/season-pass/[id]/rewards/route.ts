import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const KEY_PATTERN = /^[a-z0-9_]+$/;

const Schema = z.object({
  key: z.string().min(2).max(60).regex(KEY_PATTERN, "lowercase letters, digits, underscore only"),
  name: z.string().min(2).max(80),
  description: z.string().min(2).max(400),
  kind: z.enum(["cosmetic", "plot", "title", "item", "other"]),
  imageUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  minTierSortOrder: z.number().int().min(0).max(10).default(0),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const season = await prisma.seasonPass.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!season) return NextResponse.json({ error: "season_not_found" }, { status: 404 });

  try {
    const reward = await prisma.seasonPassReward.create({
      data: {
        seasonPassId: season.id,
        key: data.key,
        name: data.name.trim(),
        description: data.description.trim(),
        kind: data.kind,
        imageUrl: data.imageUrl ?? null,
        sortOrder: data.sortOrder,
        minTierSortOrder: data.minTierSortOrder,
      },
    });
    await logAudit(admin.userId, "season_pass.reward_create", reward.id, {
      seasonId: season.id,
      key: data.key,
    });
    return NextResponse.json(reward);
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json({ error: "duplicate_key" }, { status: 409 });
    }
    throw err;
  }
}
