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
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 64px" }}>
      <div className="eyebrow">points</div>
      <h2 style={{ marginTop: 6 }}>top up without a subscription.</h2>
      <p
        style={{
          color: "var(--text-muted)",
          maxWidth: 460,
          marginTop: 10,
          fontSize: 15,
        }}
      >
        for when you don&rsquo;t want a monthly thing but still want to be here. points from a
        top-up never expire.
      </p>

      {searchParams.success && (
        <div
          className="surface"
          style={{
            padding: 16,
            marginTop: 20,
            borderColor: "rgba(139,168,136,0.3)",
          }}
        >
          <span className="eyebrow" style={{ color: "var(--success)" }}>thank you</span>
          <div style={{ marginTop: 6, fontSize: 14 }}>
            stripe has it. your balance will land in a moment.
          </div>
        </div>
      )}
      {searchParams.canceled && (
        <div className="surface" style={{ padding: 16, marginTop: 20 }}>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
            no charge. come back whenever.
          </div>
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <PackGrid
          packs={packs.map((p) => ({
            id: p.id,
            name: p.name,
            points: p.points,
            priceCents: p.priceCents,
            currency: p.currency,
          }))}
        />
      </div>
    </main>
  );
}
