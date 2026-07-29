import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { performCheckin } from "@/lib/tour";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const session = await getSession();

  // If they aren't signed in yet, park the deep link in the session and send
  // them to Patreon OAuth — after sign-in they bounce back here.
  if (!session.userId) {
    session.pendingCheckinId = params.id;
    session.pendingCheckinToken = token;
    await session.save();
    return NextResponse.redirect(new URL("/api/auth/patreon", req.url));
  }

  const result = await performCheckin(session.userId, params.id, token);

  const qs = new URLSearchParams();
  if (!result.ok) qs.set("err", result.reason ?? "error");
  else if (result.reason === "already") qs.set("state", "already");
  else qs.set("state", "checked_in");
  if (result.pointsAwarded) qs.set("pts", String(result.pointsAwarded));
  qs.set("show", params.id);

  return NextResponse.redirect(new URL(`/shows?${qs.toString()}`, req.url));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const message = typeof body.message === "string" ? body.message : null;
  const result = await performCheckin(session.userId, params.id, token, message);
  return NextResponse.json(result);
}
