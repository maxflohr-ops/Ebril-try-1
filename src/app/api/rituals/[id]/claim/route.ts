import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { claimRitual } from "@/lib/rituals";

const Schema = z.object({
  reflection: z.string().max(1000).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    const result = await claimRitual(
      session.userId,
      params.id,
      parsed.data.reflection ?? null
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    const status = msg === "not_found" ? 404 : msg === "not_open" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
