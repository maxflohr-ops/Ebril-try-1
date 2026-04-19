import { NextResponse } from "next/server";
import { authorizeUrl, randomState } from "@/lib/patreon";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  const state = randomState();
  session.oauthState = state;
  await session.save();
  return NextResponse.redirect(authorizeUrl(state));
}
