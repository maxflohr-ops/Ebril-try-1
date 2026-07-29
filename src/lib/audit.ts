import { prisma } from "./db";

export async function logAudit(
  actorId: string,
  action: string,
  targetId?: string | null,
  payload?: unknown
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetId: targetId ?? null,
      payload: payload === undefined ? undefined : (payload as object),
    },
  });
}
