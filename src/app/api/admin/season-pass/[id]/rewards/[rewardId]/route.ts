import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; rewardId: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const reward = await prisma.seasonPassReward.findUnique({
    where: { id: params.rewardId },
    select: { id: true, seasonPassId: true, key: true },
  });
  if (!reward || reward.seasonPassId !== params.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.seasonPassReward.delete({ where: { id: reward.id } });
  await logAudit(admin.userId, "season_pass.reward_delete", reward.id, {
    seasonId: params.id,
    key: reward.key,
  });
  return NextResponse.json({ ok: true });
}
