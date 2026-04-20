import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getBalance } from "@/lib/points";

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

  const withBalances = await Promise.all(
    users.map(async (u) => ({ ...u, balance: await getBalance(u.id) }))
  );
  return NextResponse.json({ users: withBalances });
}
