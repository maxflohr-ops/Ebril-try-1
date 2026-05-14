import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const PatchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  tagline: z.string().max(200).nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
    return NextResponse.json({ error: "ends_before_starts" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.active === true) {
      await tx.seasonPass.updateMany({
        where: { active: true, NOT: { id: params.id } },
        data: { active: false },
      });
    }
    return tx.seasonPass.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
        ...(data.startsAt ? { startsAt: new Date(data.startsAt) } : {}),
        ...(data.endsAt ? { endsAt: new Date(data.endsAt) } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  });

  await logAudit(admin.userId, "season_pass.update", updated.id, { fields: Object.keys(data) });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.seasonPass.delete({ where: { id: params.id } });
  await logAudit(admin.userId, "season_pass.delete", params.id, {});
  return NextResponse.json({ ok: true });
}
