import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getBalance } from "@/lib/points";
import { getTierProgress } from "@/lib/tiers";

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ authenticated: false }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      pledges: { where: { status: "active" }, select: { amountCents: true, currency: true } },
    },
  });
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });

  const [balance, progress] = await Promise.all([
    getBalance(user.id),
    getTierProgress(user.id),
  ]);

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    balance,
    tier: progress.current,
    nextTier: progress.next,
    tierProgressPct: progress.progressPct,
    activePledgeCents: user.pledges[0]?.amountCents ?? 0,
  });
}
