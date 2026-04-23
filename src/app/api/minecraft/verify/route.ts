import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeMcUuid, readSignedRequest } from "@/lib/minecraft";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const Schema = z.object({
  code: z.string().min(6).max(16),
  mcUuid: z.string().min(16).max(40),
  mcUsername: z.string().min(1).max(32),
});

/**
 * Server → copula: a fan just typed `/copula link XXX-XXX`.
 * The plugin posts here with the code + that player's UUID + username.
 *
 * On success we pair the MinecraftAccount ↔ copula User and burn the code.
 */
export async function POST(req: NextRequest) {
  const parsed = await readSignedRequest<unknown>(req);
  if (!parsed.ok) return parsed.res;
  const body = Schema.safeParse(parsed.body);
  if (!body.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const mcUuid = normalizeMcUuid(body.data.mcUuid);
  if (!mcUuid) return NextResponse.json({ error: "invalid_uuid" }, { status: 400 });

  const normalizedCode = body.data.code.trim().toUpperCase();

  const result = await prisma.$transaction(async (tx) => {
    const code = await tx.minecraftLinkCode.findUnique({
      where: { code: normalizedCode },
    });
    if (!code) throw new Error("unknown_code");
    if (code.consumedAt) throw new Error("code_already_used");
    if (code.expiresAt.getTime() < Date.now()) throw new Error("code_expired");

    // Is this MC account already paired to a different copula user?
    const existingForUuid = await tx.minecraftAccount.findUnique({
      where: { mcUuid },
    });
    if (existingForUuid && existingForUuid.userId !== code.userId) {
      throw new Error("uuid_already_linked");
    }

    const account = await tx.minecraftAccount.upsert({
      where: { userId: code.userId },
      update: {
        mcUuid,
        mcUsername: body.data.mcUsername,
        lastSeenAt: new Date(),
      },
      create: {
        userId: code.userId,
        mcUuid,
        mcUsername: body.data.mcUsername,
        lastSeenAt: new Date(),
      },
    });

    await tx.minecraftLinkCode.update({
      where: { id: code.id },
      data: { consumedAt: new Date() },
    });

    return { userId: code.userId, account };
  }).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : "error";
    return { error: msg };
  });

  if ("error" in result) {
    const status =
      result.error === "unknown_code" || result.error === "code_expired" || result.error === "code_already_used"
        ? 400
        : result.error === "uuid_already_linked"
          ? 409
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  await logAudit(result.userId, "minecraft.link", result.account.id, {
    mcUuid,
    mcUsername: body.data.mcUsername,
  });

  return NextResponse.json({
    ok: true,
    copulaUserId: result.userId,
    mcUsername: result.account.mcUsername,
  });
}
