import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { normalizeMcUuid } from "@/lib/minecraft";

const Schema = z.object({ mcUuid: z.string().min(16).max(40) });

/**
 * Force-unlink a Minecraft account. The fan keeps their copula points and
 * history — only the pairing is dropped. Logged with the admin's userId
 * so we can trace who pulled the cord.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const mcUuid = normalizeMcUuid(parsed.data.mcUuid);
  if (!mcUuid) return NextResponse.json({ error: "invalid_uuid" }, { status: 400 });

  const account = await prisma.minecraftAccount.findUnique({ where: { mcUuid } });
  if (!account) return NextResponse.json({ ok: true, already: true });

  await prisma.minecraftAccount.delete({ where: { id: account.id } });
  await logAudit(admin.userId, "minecraft.admin_unlink", account.id, {
    mcUuid,
    targetUserId: account.userId,
  });

  return NextResponse.json({ ok: true });
}
