import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PackGrid } from "./PackGrid";

export const dynamic = "force-dynamic";

export default async function BuyPoints({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const packs = await prisma.pointPack.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
  });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Buy points</h1>
      <p style={{ color: "var(--text-muted)" }}>
        Top up your balance without a Patreon subscription. Points from packs never expire.
      </p>
      {searchParams.success && (
        <div
          style={{
            background: "rgba(124, 92, 255, 0.15)",
            border: "1px solid var(--accent-2)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          Payment received — your balance will update as soon as Stripe confirms.
        </div>
      )}
      {searchParams.canceled && (
        <div
          style={{
            background: "rgba(255, 77, 141, 0.12)",
            border: "1px solid var(--accent)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          Checkout canceled. No charge.
        </div>
      )}
      <PackGrid
        packs={packs.map((p) => ({
          id: p.id,
          name: p.name,
          points: p.points,
          priceCents: p.priceCents,
          currency: p.currency,
        }))}
      />
    </main>
  );
}
