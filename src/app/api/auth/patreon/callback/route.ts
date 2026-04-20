import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCode,
  fetchCurrentMembership,
  fetchIdentity,
} from "@/lib/patreon";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { credit } from "@/lib/points";
import { recalcUserTier } from "@/lib/tiers";
import { track } from "@/lib/analytics";
import { COLLECTIBLE_KEYS, grantCollectible } from "@/lib/collectibles";
import { performCheckin } from "@/lib/tour";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // Timing-safe state comparison; clear the pending state on *every* exit
  // (success, mismatch, malformed) so a failed callback never leaves a stale
  // CSRF token lying around to be replayed.
  const stored = session.oauthState;
  const sameLength =
    !!code && !!state && !!stored && state.length === stored.length;
  const stateOk =
    sameLength &&
    crypto.timingSafeEqual(
      Buffer.from(state as string),
      Buffer.from(stored as string)
    );
  if (!stateOk) {
    session.oauthState = undefined;
    await session.save();
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }
  session.oauthState = undefined;

  const tokens = await exchangeCode(code);
  const identity = await fetchIdentity(tokens.access_token);
  const membership = await fetchCurrentMembership(tokens.access_token).catch(() => null);

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const existing = await prisma.user.findUnique({
    where: { patreonUserId: identity.id },
    select: { id: true, referredById: true },
  });

  let referredById: string | undefined;
  if (!existing && session.pendingReferralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: session.pendingReferralCode },
      select: { id: true },
    });
    referredById = referrer?.id;
  }
  session.pendingReferralCode = undefined;

  const user = await prisma.user.upsert({
    where: { patreonUserId: identity.id },
    update: {
      email: identity.email,
      displayName: identity.fullName,
      avatarUrl: identity.avatarUrl,
      patreonAccessToken: tokens.access_token,
      patreonRefreshToken: tokens.refresh_token,
      patreonTokenExpires: expiresAt,
    },
    create: {
      patreonUserId: identity.id,
      email: identity.email,
      displayName: identity.fullName,
      avatarUrl: identity.avatarUrl,
      patreonAccessToken: tokens.access_token,
      patreonRefreshToken: tokens.refresh_token,
      patreonTokenExpires: expiresAt,
      referredById,
    },
  });

  if (membership && membership.currentlyEntitledAmountCents > 0) {
    await prisma.pledge.upsert({
      where: { patreonPledgeId: membership.membershipId },
      update: {
        amountCents: membership.currentlyEntitledAmountCents,
        status: membership.patronStatus === "active_patron" ? "active" : "paused",
        lastChargedAt: membership.lastChargeDate ? new Date(membership.lastChargeDate) : null,
      },
      create: {
        userId: user.id,
        patreonPledgeId: membership.membershipId,
        amountCents: membership.currentlyEntitledAmountCents,
        currency: "USD",
        status: membership.patronStatus === "active_patron" ? "active" : "paused",
        startedAt: membership.lastChargeDate ? new Date(membership.lastChargeDate) : new Date(),
        lastChargedAt: membership.lastChargeDate ? new Date(membership.lastChargeDate) : null,
      },
    });

    const signupRefId = `signup:${user.id}`;
    const existing = await prisma.pointTransaction.findFirst({
      where: { userId: user.id, refId: signupRefId },
    });
    if (!existing) {
      await credit({
        userId: user.id,
        amountCents: membership.currentlyEntitledAmountCents,
        reason: "signup_bonus",
        refId: signupRefId,
      });
    }
  }

  await recalcUserTier(user.id);

  if (!existing) {
    await track("auth.first_signup", { referredById: referredById ?? null }, user.id);
    await grantCollectible({
      userId: user.id,
      key: COLLECTIBLE_KEYS.welcome,
      reason: "first sign-in",
    });
  }
  await track("auth.connected", {}, user.id);

  session.userId = user.id;

  const pendingShow = session.pendingCheckinId;
  const pendingToken = session.pendingCheckinToken;
  session.pendingCheckinId = undefined;
  session.pendingCheckinToken = undefined;
  await session.save();

  if (pendingShow && pendingToken) {
    const result = await performCheckin(user.id, pendingShow, pendingToken);
    const qs = new URLSearchParams({ show: pendingShow });
    if (!result.ok) qs.set("err", result.reason ?? "error");
    else if (result.reason === "already") qs.set("state", "already");
    else qs.set("state", "checked_in");
    if (result.pointsAwarded) qs.set("pts", String(result.pointsAwarded));
    return NextResponse.redirect(new URL(`/shows?${qs.toString()}`, req.url));
  }

  return NextResponse.redirect(new URL("/", req.url));
}
