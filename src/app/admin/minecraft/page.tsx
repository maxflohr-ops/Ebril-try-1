import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface MinecraftRow {
  userId: string;
  mcUuid: string;
  mcUsername: string;
  displayName: string | null;
  email: string | null;
  tierName: string | null;
  linkedAt: Date;
  lastSeenAt: Date | null;
  mcPoints: number;
}

export default async function AdminMinecraftIndex() {
  const accounts = await prisma.minecraftAccount.findMany({
    orderBy: { lastSeenAt: { sort: "desc", nulls: "last" } },
    take: 500,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          currentTier: { select: { name: true } },
        },
      },
    },
  });

  const userIds = accounts.map((a) => a.userId);
  const mcSums = userIds.length
    ? await prisma.pointTransaction.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, reason: "minecraft_play" },
        _sum: { delta: true },
      })
    : [];
  const mcMap = new Map(mcSums.map((r) => [r.userId, r._sum.delta ?? 0]));

  const rows: MinecraftRow[] = accounts.map((a) => ({
    userId: a.userId,
    mcUuid: a.mcUuid,
    mcUsername: a.mcUsername,
    displayName: a.user.displayName,
    email: a.user.email,
    tierName: a.user.currentTier?.name ?? null,
    linkedAt: a.linkedAt,
    lastSeenAt: a.lastSeenAt,
    mcPoints: mcMap.get(a.userId) ?? 0,
  }));

  const [linkedCount, mcTotalAgg, openCodes] = await Promise.all([
    prisma.minecraftAccount.count(),
    prisma.pointTransaction.aggregate({
      _sum: { delta: true },
      where: { reason: "minecraft_play" },
    }),
    prisma.minecraftLinkCode.count({
      where: { consumedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);

  const cards = [
    { label: "linked accounts", value: linkedCount.toLocaleString() },
    {
      label: "points granted via server",
      value: (mcTotalAgg._sum.delta ?? 0).toLocaleString(),
    },
    { label: "pairing codes outstanding", value: openCodes.toLocaleString() },
  ];

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 12 }}>
        minecraft
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        every fan paired with the dusk server. click in to see grant history
        or push a one-off grant. the plugin contract lives at{" "}
        <code style={{ color: "var(--text)" }}>docs/minecraft-integration.md</code>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
        {cards.map((c) => (
          <div key={c.label} className="admin-surface" style={{ padding: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {c.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, marginTop: 6 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="admin-surface" style={{ padding: 18, color: "var(--text-muted)", fontSize: 14 }}>
          nothing yet — once a fan runs /copula link they&rsquo;ll show up here.
        </div>
      ) : (
        <div
          className="admin-surface"
          style={{ padding: 0, overflow: "hidden" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 0.8fr 0.9fr 0.9fr 0.5fr",
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            <div>fan</div>
            <div>mc name</div>
            <div>tier</div>
            <div>mc points</div>
            <div>last seen</div>
            <div></div>
          </div>
          {rows.map((r) => (
            <div
              key={r.userId}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 0.8fr 0.9fr 0.9fr 0.5fr",
                padding: "12px 14px",
                borderTop: "1px solid rgba(255,255,255,0.03)",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <div>
                <div>{r.displayName?.toLowerCase() ?? r.email ?? r.userId.slice(0, 8)}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                  {r.email ?? "—"}
                </div>
              </div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }}>
                {r.mcUsername}
              </div>
              <div style={{ color: "var(--text-muted)" }}>
                {r.tierName?.toLowerCase() ?? "unranked"}
              </div>
              <div
                style={{
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: 18,
                  fontWeight: 500,
                  color: "var(--accent)",
                }}
              >
                {r.mcPoints.toLocaleString()}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {r.lastSeenAt
                  ? r.lastSeenAt.toISOString().slice(0, 10)
                  : "never"}
              </div>
              <div style={{ textAlign: "right" }}>
                <Link href={`/admin/minecraft/${r.mcUuid}`} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                  open
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
