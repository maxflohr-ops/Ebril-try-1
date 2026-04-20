import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  await prisma.user.update({
    where: { id: session.userId },
    data: { onboardedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
