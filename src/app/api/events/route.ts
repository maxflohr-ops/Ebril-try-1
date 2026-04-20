import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { track, type EventName } from "@/lib/analytics";
import { rateLimit } from "@/lib/ratelimit";

const ALLOWED: EventName[] = ["page.viewed", "push.subscribed"];

const Schema = z.object({
  name: z.enum(ALLOWED as [EventName, ...EventName[]]),
  payload: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();

  // This endpoint is anonymous by design — beacon from page load — so rate
  // limit by user id when signed in, IP otherwise. An unbounded anonymous
  // write path would flood analytics_event and add DB cost.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anon";
  const key = session.userId ? `ev:u:${session.userId}` : `ev:ip:${ip}`;
  const limit = rateLimit(key, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": Math.ceil(limit.retryAfterMs / 1000).toString() } }
    );
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await track(parsed.data.name, parsed.data.payload, session.userId ?? null);
  return NextResponse.json({ ok: true });
}
