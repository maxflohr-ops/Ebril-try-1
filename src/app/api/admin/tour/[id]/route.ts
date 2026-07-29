import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const PatchSchema = z.object({
  rotateQr: z.boolean().optional(),
  pointsReward: z.number().int().min(0).optional(),
  noteFromEbril: z.string().max(800).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.rotateQr) data.qrSecret = crypto.randomBytes(16).toString("hex");
  if (parsed.data.pointsReward !== undefined) data.pointsReward = parsed.data.pointsReward;
  if (parsed.data.noteFromEbril !== undefined) data.noteFromEbril = parsed.data.noteFromEbril;

  const date = await prisma.tourDate.update({ where: { id: params.id }, data });
  await logAudit(admin.userId, "tour.update", date.id, parsed.data);
  return NextResponse.json({ date });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.tourDate.delete({ where: { id: params.id } });
  await logAudit(admin.userId, "tour.delete", params.id);
  return NextResponse.json({ ok: true });
}
