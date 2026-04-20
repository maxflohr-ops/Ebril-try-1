import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  name: z.string().min(1).max(80).optional(),
  points: z.number().int().min(1).optional(),
  priceCents: z.number().int().min(50).optional(),
  currency: z.string().length(3).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const pack = await prisma.pointPack.update({ where: { id: params.id }, data: parsed.data });
  await logAudit(admin.userId, "point_pack.update", pack.id, parsed.data);
  return NextResponse.json({ pack });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.pointPack.update({ where: { id: params.id }, data: { active: false } });
  await logAudit(admin.userId, "point_pack.archive", params.id);
  return NextResponse.json({ ok: true });
}
