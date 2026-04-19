import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { track, type EventName } from "@/lib/analytics";

const ALLOWED: EventName[] = ["page.viewed", "push.subscribed"];

const Schema = z.object({
  name: z.enum(ALLOWED as [EventName, ...EventName[]]),
  payload: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await track(parsed.data.name, parsed.data.payload, session.userId ?? null);
  return NextResponse.json({ ok: true });
}
