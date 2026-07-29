import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { LINK_KINDS } from "@/lib/externalLinks";

const Schema = z.object({
  kind: z.enum(LINK_KINDS as [string, ...string[]]).optional(),
  label: z.string().min(1).max(80).optional(),
  url: z.string().url().optional(),
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
  const link = await prisma.externalLink.update({
    where: { id: params.id },
    data: parsed.data as never,
  });
  await logAudit(admin.userId, "link.update", link.id, parsed.data);
  return NextResponse.json({ link });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.externalLink.delete({ where: { id: params.id } });
  await logAudit(admin.userId, "link.delete", params.id);
  return NextResponse.json({ ok: true });
}
