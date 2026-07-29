import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.inspirationImage.delete({
    where: { id: params.imageId },
  });
  await logAudit(admin.userId, "inspiration.delete", params.imageId);
  return NextResponse.json({ ok: true });
}
