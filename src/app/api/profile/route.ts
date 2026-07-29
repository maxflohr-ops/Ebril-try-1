import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

const Schema = z.object({
  dob: z.string().date().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data: { dob?: Date | null } = {};
  if (parsed.data.dob !== undefined) {
    data.dob = parsed.data.dob ? new Date(`${parsed.data.dob}T00:00:00Z`) : null;
  }
  const user = await prisma.user.update({ where: { id: session.userId }, data });
  return NextResponse.json({ user: { id: user.id, dob: user.dob } });
}
