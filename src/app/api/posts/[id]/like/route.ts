import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const limit = rateLimit(`like:${session.userId}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": Math.ceil(limit.retryAfterMs / 1000).toString() } }
    );
  }

  const existing = await prisma.postLike.findUnique({
    where: { userId_postId: { userId: session.userId, postId: params.id } },
  });
  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    const count = await prisma.postLike.count({ where: { postId: params.id } });
    return NextResponse.json({ liked: false, count });
  }
  await prisma.postLike.create({
    data: { userId: session.userId, postId: params.id },
  });
  const count = await prisma.postLike.count({ where: { postId: params.id } });
  return NextResponse.json({ liked: true, count });
}
