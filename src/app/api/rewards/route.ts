import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const rewards = await prisma.reward.findMany({
    where: { active: true },
    orderBy: { costPoints: "asc" },
    include: { tierRequired: { select: { id: true, name: true, sortOrder: true } } },
  });
  return NextResponse.json({ rewards });
}
