import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const redemptions = await prisma.redemption.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      reward: true,
      user: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
    },
    take: 200,
  });
  return NextResponse.json({ redemptions });
}
