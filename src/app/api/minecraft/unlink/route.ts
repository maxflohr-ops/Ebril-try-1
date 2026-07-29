import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

/** Fan-initiated: unlink the Minecraft account. Idempotent. */
export async function POST() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const account = await prisma.minecraftAccount.findUnique({
    where: { userId: session.userId },
  });
  if (!account) return NextResponse.json({ ok: true, already: true });

  await prisma.minecraftAccount.delete({ where: { id: account.id } });
  await logAudit(session.userId, "minecraft.unlink", account.id, {
    mcUuid: account.mcUuid,
  });
  return NextResponse.json({ ok: true });
}
