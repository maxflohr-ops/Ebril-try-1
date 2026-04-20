import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const PatchSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  direction: z.string().min(1).max(4000).optional(),
  exampleUrl: z.string().url().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  platformHint: z.string().max(80).nullable().optional(),
  hashtagHint: z.string().max(80).nullable().optional(),
  pointsApproved: z.number().int().min(0).optional(),
  pointsFeatured: z.number().int().min(0).optional(),
  pointsViral: z.number().int().min(0).optional(),
  viralThreshold: z.number().int().min(0).nullable().optional(),
  featuredCollectibleKey: z.string().max(60).nullable().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const direction = await prisma.clippingBrief.update({
    where: { id: params.id },
    data: parsed.data,
  });
  await logAudit(admin.userId, "direction.update", direction.id, parsed.data);
  return NextResponse.json({ direction });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.clippingBrief.update({
    where: { id: params.id },
    data: { active: false },
  });
  await logAudit(admin.userId, "direction.archive", params.id);
  return NextResponse.json({ ok: true });
}
