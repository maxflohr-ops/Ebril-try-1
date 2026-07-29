import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { LINK_KINDS } from "@/lib/externalLinks";

const Schema = z.object({
  kind: z.enum(LINK_KINDS as [string, ...string[]]),
  label: z.string().min(1).max(80),
  url: z.string().url(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const links = await prisma.externalLink.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const link = await prisma.externalLink.create({ data: parsed.data as never });
  await logAudit(admin.userId, "link.create", link.id, parsed.data);
  return NextResponse.json({ link });
}
