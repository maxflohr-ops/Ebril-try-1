import { prisma } from "./db";
import { fetchCurrentMembership, fetchIdentity, refreshTokens } from "./patreon";
import { credit } from "./points";
import { recalcUserTier } from "./tiers";

const REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function ensureFreshToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      patreonAccessToken: true,
      patreonRefreshToken: true,
      patreonTokenExpires: true,
    },
  });
  if (!user?.patreonAccessToken) return null;

  const expiresAt = user.patreonTokenExpires?.getTime() ?? 0;
  const fresh = expiresAt - Date.now() > REFRESH_WINDOW_MS;
  if (fresh) return user.patreonAccessToken;

  if (!user.patreonRefreshToken) return user.patreonAccessToken;

  try {
    const tokens = await refreshTokens(user.patreonRefreshToken);
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await prisma.user.update({
      where: { id: userId },
      data: {
        patreonAccessToken: tokens.access_token,
        patreonRefreshToken: tokens.refresh_token,
        patreonTokenExpires: newExpiresAt,
      },
    });
    return tokens.access_token;
  } catch (err) {
    console.error(`[patreon] refresh failed for user=${userId}`, err);
    return null;
  }
}

export interface ReconcileResult {
  userId: string;
  status: "ok" | "skipped" | "error";
  reason?: string;
  tierChanged?: boolean;
  pledgeChanged?: boolean;
}

export async function reconcilePledgeForUser(userId: string): Promise<ReconcileResult> {
  const accessToken = await ensureFreshToken(userId);
  if (!accessToken) return { userId, status: "skipped", reason: "no_token" };

  try {
    // Capture the pre-reconcile tier id BEFORE any downstream mutations.
    // recalcUserTier runs at the end and the comparison has to be against
    // the tier we had going in, not against an already-updated row.
    const beforeUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentTierId: true },
    });
    const previousTierId = beforeUser?.currentTierId ?? null;

    const [identity, membership] = await Promise.all([
      fetchIdentity(accessToken),
      fetchCurrentMembership(accessToken).catch(() => null),
    ]);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        email: identity.email,
        displayName: identity.fullName,
        avatarUrl: identity.avatarUrl,
      },
    });

    let pledgeChanged = false;

    if (membership) {
      const status =
        membership.patronStatus === "active_patron"
          ? "active"
          : membership.patronStatus === "declined_patron"
            ? "declined"
            : membership.patronStatus === "former_patron"
              ? "cancelled"
              : "paused";

      const existing = await prisma.pledge.findUnique({
        where: { patreonPledgeId: membership.membershipId },
      });

      await prisma.pledge.upsert({
        where: { patreonPledgeId: membership.membershipId },
        update: {
          amountCents: membership.currentlyEntitledAmountCents,
          status,
          lastChargedAt: membership.lastChargeDate
            ? new Date(membership.lastChargeDate)
            : null,
        },
        create: {
          userId: user.id,
          patreonPledgeId: membership.membershipId,
          amountCents: membership.currentlyEntitledAmountCents,
          currency: "USD",
          status,
          startedAt: membership.lastChargeDate
            ? new Date(membership.lastChargeDate)
            : new Date(),
          lastChargedAt: membership.lastChargeDate
            ? new Date(membership.lastChargeDate)
            : null,
        },
      });

      pledgeChanged =
        !existing ||
        existing.amountCents !== membership.currentlyEntitledAmountCents ||
        existing.status !== status;

      if (
        membership.lastChargeStatus === "Paid" &&
        membership.currentlyEntitledAmountCents > 0 &&
        membership.lastChargeDate
      ) {
        const refId = `charge:${membership.membershipId}:${membership.lastChargeDate}`;
        const chargeExists = await prisma.pointTransaction.findFirst({
          where: { userId: user.id, refId },
        });
        if (!chargeExists) {
          const now = new Date();
          const campaigns = await prisma.campaign.findMany({
            where: { startsAt: { lte: now }, endsAt: { gte: now } },
          });
          const multiplier = campaigns.reduce((acc, c) => acc * c.multiplier, 1);
          await credit({
            userId: user.id,
            amountCents: membership.currentlyEntitledAmountCents,
            reason: "pledge_charge",
            refId,
            multiplier,
          });
        }
      }
    }

    const newTier = await recalcUserTier(user.id);
    const tierChanged = (newTier?.id ?? null) !== (previousTierId ?? null);

    return { userId, status: "ok", pledgeChanged, tierChanged };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    console.error(`[patreon] reconcile failed user=${userId}`, err);
    return { userId, status: "error", reason };
  }
}
