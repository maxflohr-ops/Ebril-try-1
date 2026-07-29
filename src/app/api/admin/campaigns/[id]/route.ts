import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  multiplier: z.number().min(1).max(10).optional(),
  flatBonus: z.number().int().min(0).max(1_000_000).nullish(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  tierFilter: z.array(z.string()).nullish(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = UpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const campaign = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.multiplier !== undefined && { multiplier: data.multiplier }),
      ...(data.flatBonus !== undefined && { flatBonus: data.flatBonus }),
      ...(data.startsAt !== undefined && { startsAt: new Date(data.startsAt) }),
      ...(data.endsAt !== undefined && { endsAt: new Date(data.endsAt) }),
      ...(data.tierFilter !== undefined && { tierFilter: data.tierFilter ?? undefined }),
    },
  });
  await logAudit(admin.userId, "campaign.update", campaign.id, data);
  return NextResponse.json({ campaign });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.campaign.delete({ where: { id: params.id } });
  await logAudit(admin.userId, "campaign.delete", params.id);
  return NextResponse.json({ ok: true });
}
