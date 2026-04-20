import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tagline: z.string().max(200).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  artworkUrl: z.string().url().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  isCurrent: z.boolean().optional(),
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

  const era = await prisma.$transaction(async (tx) => {
    if (parsed.data.isCurrent === true) {
      await tx.era.updateMany({
        where: { isCurrent: true, id: { not: params.id } },
        data: { isCurrent: false },
      });
    }
    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.startsAt) data.startsAt = new Date(parsed.data.startsAt);
    if (parsed.data.endsAt) data.endsAt = new Date(parsed.data.endsAt);
    return tx.era.update({ where: { id: params.id }, data });
  });
  await logAudit(admin.userId, "era.update", era.id, parsed.data);
  return NextResponse.json({ era });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.era.update({
    where: { id: params.id },
    data: { active: false, isCurrent: false },
  });
  await logAudit(admin.userId, "era.archive", params.id);
  return NextResponse.json({ ok: true });
}
