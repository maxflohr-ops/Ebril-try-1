import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const PatchSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  album: z.string().max(160).nullable().optional(),
  lyrics: z.string().min(1).max(20000).optional(),
  noteFromEbril: z.string().max(4000).nullable().optional(),
  artworkUrl: z.string().url().nullable().optional(),
  durationSec: z.number().int().min(1).max(60 * 60).nullable().optional(),
  releaseDate: z.string().datetime().nullable().optional(),
  spotifyUrl: z.string().url().nullable().optional(),
  appleMusicUrl: z.string().url().nullable().optional(),
  youtubeUrl: z.string().url().nullable().optional(),
  bandcampUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.releaseDate) data.releaseDate = new Date(parsed.data.releaseDate);

  const song = await prisma.song.update({ where: { id: params.id }, data });
  await logAudit(admin.userId, "song.update", song.id, parsed.data);
  return NextResponse.json({ song });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.song.update({
    where: { id: params.id },
    data: { active: false },
  });
  await logAudit(admin.userId, "song.archive", params.id);
  return NextResponse.json({ ok: true });
}
