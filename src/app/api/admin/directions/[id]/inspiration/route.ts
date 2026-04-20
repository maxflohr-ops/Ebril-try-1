import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  url: z.string().url(),
  pinUrl: z.string().url().nullable().optional(),
  caption: z.string().max(280).nullable().optional(),
  attribution: z.string().max(120).nullable().optional(),
  source: z.string().max(40).default("pinterest"),
  sortOrder: z.number().int().default(0),
});

const BatchSchema = z.object({
  items: z.array(Schema).min(1).max(40),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const images = await prisma.inspirationImage.findMany({
    where: { briefId: params.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ images });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  // accept either a single item or a batch — Pinterest admins often paste 5-10
  // pins at once.
  const parsedBatch = BatchSchema.safeParse(body);
  const parsedSingle = Schema.safeParse(body);

  const items = parsedBatch.success
    ? parsedBatch.data.items
    : parsedSingle.success
      ? [parsedSingle.data]
      : null;
  if (!items) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const created = await prisma.$transaction(
    items.map((item, i) =>
      prisma.inspirationImage.create({
        data: {
          briefId: params.id,
          url: item.url,
          pinUrl: item.pinUrl ?? null,
          caption: item.caption ?? null,
          attribution: item.attribution ?? null,
          source: item.source ?? "pinterest",
          sortOrder: item.sortOrder || i,
        },
      })
    )
  );
  await logAudit(admin.userId, "inspiration.add", params.id, {
    count: created.length,
  });
  return NextResponse.json({ images: created });
}
