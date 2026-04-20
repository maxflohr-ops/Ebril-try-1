import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const PatchSchema = z.object({
  body: z.string().min(1).max(2000).optional(),
  pinned: z.boolean().optional(),
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
  const post = await prisma.post.update({
    where: { id: params.id },
    data: parsed.data,
  });
  await logAudit(admin.userId, "post.update", post.id, parsed.data);
  return NextResponse.json({ post });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.post.update({
    where: { id: params.id },
    data: { active: false },
  });
  await logAudit(admin.userId, "post.archive", params.id);
  return NextResponse.json({ ok: true });
}
