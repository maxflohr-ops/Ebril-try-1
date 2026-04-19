import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  oauthState?: string;
  isAdmin?: boolean;
}

const sessionPassword = process.env.SESSION_SECRET;

if (!sessionPassword && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET is required in production");
}

export const sessionOptions: SessionOptions = {
  password: sessionPassword ?? "dev-only-insecure-password-change-me-at-least-32-chars",
  cookieName: "ebril_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}
