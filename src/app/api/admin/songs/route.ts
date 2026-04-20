import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";

const Schema = z.object({
  title: z.string().min(1).max(160),
  slug: z.string().max(80).optional(),
  album: z.string().max(160).optional().nullable(),
  lyrics: z.string().min(1).max(20000),
  noteFromEbril: z.string().max(4000).optional().nullable(),
  artworkUrl: z.string().url().optional().nullable(),
  durationSec: z.number().int().min(1).max(60 * 60).optional().nullable(),
  releaseDate: z.string().datetime().optional().nullable(),
  spotifyUrl: z.string().url().optional().nullable(),
  appleMusicUrl: z.string().url().optional().nullable(),
  youtubeUrl: z.string().url().optional().nullable(),
  bandcampUrl: z.string().url().optional().nullable(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const songs = await prisma.song.findMany({
    orderBy: [{ sortOrder: "asc" }, { releaseDate: "desc" }, { title: "asc" }],
  });
  return NextResponse.json({ songs });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const slug = parsed.data.slug?.trim() || slugify(parsed.data.title);
  const song = await prisma.song.create({
    data: {
      title: parsed.data.title,
      slug,
      album: parsed.data.album ?? null,
      lyrics: parsed.data.lyrics,
      noteFromEbril: parsed.data.noteFromEbril ?? null,
      artworkUrl: parsed.data.artworkUrl ?? null,
      durationSec: parsed.data.durationSec ?? null,
      releaseDate: parsed.data.releaseDate ? new Date(parsed.data.releaseDate) : null,
      spotifyUrl: parsed.data.spotifyUrl ?? null,
      appleMusicUrl: parsed.data.appleMusicUrl ?? null,
      youtubeUrl: parsed.data.youtubeUrl ?? null,
      bandcampUrl: parsed.data.bandcampUrl ?? null,
      sortOrder: parsed.data.sortOrder,
      active: parsed.data.active,
    },
  });
  await logAudit(admin.userId, "song.create", song.id, { title: parsed.data.title, slug });
  return NextResponse.json({ song });
}
