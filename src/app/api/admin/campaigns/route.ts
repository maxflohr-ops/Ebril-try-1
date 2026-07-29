import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  multiplier: z.number().min(1).max(10),
  flatBonus: z.number().int().min(0).max(1_000_000).nullish(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  tierFilter: z.array(z.string()).nullish(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const campaigns = await prisma.campaign.findMany({ orderBy: { startsAt: "desc" } });
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;
  if (new Date(input.endsAt) <= new Date(input.startsAt)) {
    return NextResponse.json({ error: "endsAt must be after startsAt" }, { status: 400 });
  }
  const campaign = await prisma.campaign.create({
    data: {
      name: input.name,
      multiplier: input.multiplier,
      flatBonus: input.flatBonus ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      tierFilter: input.tierFilter ?? undefined,
    },
  });
  await logAudit(admin.userId, "campaign.create", campaign.id, input);
  return NextResponse.json({ campaign });
}
