import { prisma } from "./db";

export type EventName =
  | "auth.connected"
  | "auth.first_signup"
  | "pledge.charged"
  | "campaign.applied"
  | "redemption.created"
  | "redemption.status_changed"
  | "tier.changed"
  | "push.subscribed"
  | "page.viewed";

export async function track(
  name: EventName,
  payload?: Record<string, unknown>,
  userId?: string | null
) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name,
        payload: payload ?? undefined,
        userId: userId ?? null,
      },
    });
  } catch (err) {
    console.error("[analytics] failed", name, err);
  }
}
