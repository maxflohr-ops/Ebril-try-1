import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().nullish(),
  costPoints: z.number().int().min(1).optional(),
  stock: z.number().int().min(0).nullish(),
  tierRequiredId: z.string().uuid().nullish(),
  active: z.boolean().optional(),
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
  const reward = await prisma.reward.update({
    where: { id: params.id },
    data: parsed.data,
  });
  await logAudit(admin.userId, "reward.update", reward.id, parsed.data);
  return NextResponse.json({ reward });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.reward.update({
    where: { id: params.id },
    data: { active: false },
  });
  await logAudit(admin.userId, "reward.archive", params.id);
  return NextResponse.json({ ok: true });
}
