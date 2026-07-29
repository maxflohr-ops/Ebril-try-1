import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  body: z.string().min(1).max(2000),
  imageUrl: z.string().url().nullable().optional(),
  audioUrl: z.string().url().nullable().optional(),
  linkUrl: z.string().url().nullable().optional(),
  linkLabel: z.string().max(40).nullable().optional(),
  moodTag: z.string().max(40).nullable().optional(),
  publishedAt: z.string().datetime().optional(),
  pinned: z.boolean().default(false),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const posts = await prisma.post.findMany({
    orderBy: [{ active: "desc" }, { pinned: "desc" }, { publishedAt: "desc" }],
    include: { _count: { select: { likes: true } } },
  });
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const post = await prisma.post.create({
    data: {
      body: parsed.data.body,
      imageUrl: parsed.data.imageUrl ?? null,
      audioUrl: parsed.data.audioUrl ?? null,
      linkUrl: parsed.data.linkUrl ?? null,
      linkLabel: parsed.data.linkLabel ?? null,
      moodTag: parsed.data.moodTag ?? null,
      publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : new Date(),
      pinned: parsed.data.pinned,
    },
  });
  await logAudit(admin.userId, "post.create", post.id, parsed.data);
  return NextResponse.json({ post });
}
