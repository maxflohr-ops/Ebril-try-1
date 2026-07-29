import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ users: [] });

  const needle = q.toLowerCase();
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: needle, mode: "insensitive" } },
        { displayName: { contains: needle, mode: "insensitive" } },
        { patreonUserId: { contains: needle } },
        { id: { contains: needle } },
      ],
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      avatarUrl: true,
      patreonUserId: true,
      currentTier: { select: { name: true } },
    },
    take: 12,
  });

  // Single grouped aggregate instead of N-per-user getBalance calls.
  const now = new Date();
  const ids = users.map((u) => u.id);
  const balances =
    ids.length === 0
      ? []
      : await prisma.pointTransaction.groupBy({
          by: ["userId"],
          where: {
            userId: { in: ids },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          _sum: { delta: true },
        });
  const balanceMap = new Map(balances.map((b) => [b.userId, b._sum.delta ?? 0]));

  const withBalances = users.map((u) => ({ ...u, balance: balanceMap.get(u.id) ?? 0 }));

  // Low-verbosity audit entry so admin fishing expeditions are observable.
  // Payload captures only the query term + hit count — never the full user
  // list.
  await logAudit(admin.userId, "admin.user_search", null, {
    q: q.slice(0, 80),
    hits: users.length,
  });

  return NextResponse.json({ users: withBalances });
}
