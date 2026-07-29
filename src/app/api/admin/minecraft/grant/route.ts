import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { credit, defaultExpiry } from "@/lib/points";
import { sendPushToUser } from "@/lib/push";
import { normalizeMcUuid } from "@/lib/minecraft";

const Schema = z.object({
  mcUuid: z.string().min(16).max(40),
  points: z.number().int().min(1).max(5000),
  reason: z.string().min(3).max(200),
  notify: z.boolean().default(false),
});

/**
 * Admin-side grant against a linked Minecraft account. Lands in the ledger
 * as a minecraft_play row so it rolls up into the same buckets as
 * server-driven grants. refId is admin-scoped so it can never collide
 * with a plugin-issued grant.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const { points, reason, notify } = parsed.data;

  const mcUuid = normalizeMcUuid(parsed.data.mcUuid);
  if (!mcUuid) return NextResponse.json({ error: "invalid_uuid" }, { status: 400 });

  const account = await prisma.minecraftAccount.findUnique({ where: { mcUuid } });
  if (!account) return NextResponse.json({ error: "not_linked" }, { status: 404 });

  const refId = `mc:admin:${admin.userId}:${Date.now()}`;

  const row = await credit({
    userId: account.userId,
    amountCents: 0,
    reason: "minecraft_play",
    refId,
    flatBonus: points,
    expiresAt: defaultExpiry(),
  });

  await logAudit(admin.userId, "minecraft.admin_grant", account.id, {
    points,
    reason,
    mcUuid,
    txId: row?.id,
  });

  if (notify) {
    await sendPushToUser(account.userId, {
      title: `+${points.toLocaleString()} points from the server`,
      body: reason,
      url: "/",
    });
  }

  return NextResponse.json({ ok: true, idempotent: false, pointsAwarded: points });
}
