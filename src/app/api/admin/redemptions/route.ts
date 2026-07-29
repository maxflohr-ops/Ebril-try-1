import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { RedemptionStatus } from "@prisma/client";

const VALID_STATUSES = new Set<string>(Object.values(RedemptionStatus));

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const raw = req.nextUrl.searchParams.get("status") ?? undefined;
  // Validate against the enum — never pass arbitrary strings to Prisma as an
  // enum value; Prisma 5 throws a 500-level error instead of treating it as
  // "no match".
  const status = raw && VALID_STATUSES.has(raw) ? (raw as RedemptionStatus) : undefined;
  const redemptions = await prisma.redemption.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      reward: true,
      user: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
    },
    take: 200,
  });
  return NextResponse.json({ redemptions });
}
