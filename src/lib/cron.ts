import crypto from "node:crypto";
import { NextRequest } from "next/server";

export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length === expected.length) {
    try {
      if (
        crypto.timingSafeEqual(
          Buffer.from(header),
          Buffer.from(expected)
        )
      ) {
        return true;
      }
    } catch {
      // length mismatch through unicode normalization etc. fall through.
    }
  }

  if (req.headers.get("x-vercel-cron") === "1" && process.env.VERCEL === "1") {
    return true;
  }
  return false;
}
