import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  title: z.string().min(1).max(120),
  caption: z.string().min(1).max(600),
  audioUrl: z.string().url(),
  durationSec: z.number().int().min(1).max(60 * 60),
  tierRequiredId: z.string().uuid().nullish(),
  publishedAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const notes = await prisma.voiceNote.findMany({
    orderBy: { publishedAt: "desc" },
    include: {
      tierRequired: { select: { name: true } },
      _count: { select: { listens: true } },
    },
  });
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const note = await prisma.voiceNote.create({
    data: {
      title: parsed.data.title,
      caption: parsed.data.caption,
      audioUrl: parsed.data.audioUrl,
      durationSec: parsed.data.durationSec,
      tierRequiredId: parsed.data.tierRequiredId ?? null,
      publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : new Date(),
      active: parsed.data.active,
    },
  });
  await logAudit(admin.userId, "voice_note.create", note.id, parsed.data);
  return NextResponse.json({ note });
}
