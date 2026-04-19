import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  imageUrl: z.string().url().nullish(),
  costPoints: z.number().int().min(1),
  stock: z.number().int().min(0).nullish(),
  tierRequiredId: z.string().uuid().nullish(),
  type: z.enum(["merch", "signed", "call_1on1", "content_unlock", "discount_code"]),
  active: z.boolean().default(true),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rewards = await prisma.reward.findMany({
    orderBy: [{ active: "desc" }, { costPoints: "asc" }],
  });
  return NextResponse.json({ rewards });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const reward = await prisma.reward.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl ?? null,
      costPoints: parsed.data.costPoints,
      stock: parsed.data.stock ?? null,
      tierRequiredId: parsed.data.tierRequiredId ?? null,
      type: parsed.data.type,
      active: parsed.data.active,
    },
  });
  await logAudit(admin.userId, "reward.create", reward.id, parsed.data);
  return NextResponse.json({ reward });
}
