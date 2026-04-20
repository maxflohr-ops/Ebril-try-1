import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  oauthState?: string;
  pendingReferralCode?: string;
  pendingCheckinId?: string;
  pendingCheckinToken?: string;
}

const sessionPassword = process.env.SESSION_SECRET;

if (!sessionPassword && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET is required in production");
}

// 30-day server-side session ttl; cookie expiration matches so a stolen
// cookie can't be replayed indefinitely, and iron-session rejects tokens
// past their ttl even if the cookie is presented.
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export const sessionOptions: SessionOptions = {
  password: sessionPassword ?? "dev-only-insecure-password-change-me-at-least-32-chars",
  cookieName: "ebril_session",
  ttl: SESSION_TTL_SECONDS,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}
