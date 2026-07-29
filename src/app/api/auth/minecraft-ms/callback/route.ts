import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { normalizeMcUuid } from "@/lib/minecraft";
import {
  authorizeAndFetchProfile,
  XboxRequirementError,
} from "@/lib/minecraftMicrosoft";

export const runtime = "nodejs";

function back(req: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL("/profile", req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

/**
 * Microsoft callback. Validates state with a timing-safe compare,
 * exchanges the code, walks the Xbox Live → XSTS → Mojang chain, and
 * upserts the MinecraftAccount on success. We never persist any
 * Microsoft or Mojang tokens — we only need them long enough to verify
 * who owns this Minecraft profile.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return back(req, { mc: "no_session" });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthErr = url.searchParams.get("error");

  const stored = session.msOauthState;
  const sameLength = !!code && !!state && !!stored && state.length === stored.length;
  const stateOk =
    sameLength &&
    crypto.timingSafeEqual(Buffer.from(state as string), Buffer.from(stored as string));
  // Always clear the pending state so a failed callback can't be replayed.
  session.msOauthState = undefined;
  await session.save();

  if (oauthErr) return back(req, { mc: "denied" });
  if (!stateOk || !code) return back(req, { mc: "invalid_state" });

  let profile;
  try {
    profile = await authorizeAndFetchProfile(code);
  } catch (err) {
    if (err instanceof XboxRequirementError) {
      // Map common XErr codes to friendly query strings the profile page
      // can render. Everything else falls through to a generic error.
      const friendly =
        err.xerr === "2148916233"
          ? "no_xbox"
          : err.xerr === "2148916238"
            ? "child_account"
            : err.xerr === "2148916235"
              ? "region_banned"
              : "xbox_unavailable";
      return back(req, { mc: friendly });
    }
    console.error("minecraft-ms callback:", err);
    return back(req, { mc: "error" });
  }

  if (!profile) return back(req, { mc: "no_java" });

  const mcUuid = normalizeMcUuid(profile.id);
  if (!mcUuid) return back(req, { mc: "bad_uuid" });

  // Refuse to silently re-bind a Minecraft UUID that's already owned by
  // a different copula user. The other person has to unlink first.
  const existingForUuid = await prisma.minecraftAccount.findUnique({
    where: { mcUuid },
    select: { userId: true },
  });
  if (existingForUuid && existingForUuid.userId !== session.userId) {
    return back(req, { mc: "uuid_taken" });
  }

  await prisma.minecraftAccount.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      mcUuid,
      mcUsername: profile.name,
    },
    update: {
      mcUuid,
      mcUsername: profile.name,
    },
  });

  await logAudit(session.userId, "minecraft.link", null, {
    via: "microsoft_oauth",
    mcUuid,
    mcUsername: profile.name,
  });

  return back(req, { mc: "linked" });
}
