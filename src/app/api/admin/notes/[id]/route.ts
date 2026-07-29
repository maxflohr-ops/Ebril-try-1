import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.voiceNote.update({
    where: { id: params.id },
    data: { active: false },
  });
  await logAudit(admin.userId, "voice_note.archive", params.id);
  return NextResponse.json({ ok: true });
}
