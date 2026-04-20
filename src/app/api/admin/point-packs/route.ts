import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  name: z.string().min(1).max(80),
  points: z.number().int().min(1),
  priceCents: z.number().int().min(50),
  currency: z.string().length(3).default("USD"),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const packs = await prisma.pointPack.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { priceCents: "asc" }],
  });
  return NextResponse.json({ packs });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const pack = await prisma.pointPack.create({ data: parsed.data });
  await logAudit(admin.userId, "point_pack.create", pack.id, parsed.data);
  return NextResponse.json({ pack });
}
