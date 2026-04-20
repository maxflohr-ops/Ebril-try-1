import { Prisma } from "@prisma/client";
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
        // Prisma's Json input wants its own shape; cast since our payload is
        // always a plain record at the boundary.
        payload: payload ? (payload as Prisma.InputJsonValue) : undefined,
        userId: userId ?? null,
      },
    });
  } catch (err) {
    console.error("[analytics] failed", name, err);
  }
}
