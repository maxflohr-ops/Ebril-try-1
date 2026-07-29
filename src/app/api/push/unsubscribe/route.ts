import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

const Schema = z.object({ endpoint: z.string().url() });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  await prisma.pushSubscription
    .deleteMany({ where: { endpoint: parsed.data.endpoint, userId: session.userId } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
