import { getSession } from "./session";
import { prisma } from "./db";

export function adminPatreonIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_PATREON_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export async function requireAdmin(): Promise<{ userId: string } | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { patreonUserId: true },
  });
  if (!user) return null;
  const allow = adminPatreonIds();
  if (allow.size === 0) return null;
  if (!allow.has(user.patreonUserId)) return null;
  return { userId: session.userId };
}

export async function isAdmin(): Promise<boolean> {
  return (await requireAdmin()) !== null;
}
