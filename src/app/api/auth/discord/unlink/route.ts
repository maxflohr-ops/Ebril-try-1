import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const account = await prisma.discordAccount.findUnique({
    where: { userId: session.userId },
  });
  if (!account) return NextResponse.json({ ok: true, already: true });

  await prisma.discordAccount.delete({ where: { id: account.id } });
  await logAudit(session.userId, "discord.unlink", account.id, {
    discordUserId: account.discordUserId,
  });
  return NextResponse.json({ ok: true });
}
