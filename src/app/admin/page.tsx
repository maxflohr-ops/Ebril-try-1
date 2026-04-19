import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [userCount, activePledges, pointsIn, pointsOut, redemptionsPending] = await Promise.all([
    prisma.user.count(),
    prisma.pledge.count({ where: { status: "active" } }),
    prisma.pointTransaction.aggregate({ _sum: { delta: true }, where: { delta: { gt: 0 } } }),
    prisma.pointTransaction.aggregate({ _sum: { delta: true }, where: { delta: { lt: 0 } } }),
    prisma.redemption.count({ where: { status: "pending" } }),
  ]);
  const circulating = (pointsIn._sum.delta ?? 0) + (pointsOut._sum.delta ?? 0);

  const cards = [
    { label: "Users", value: userCount.toLocaleString() },
    { label: "Active pledges", value: activePledges.toLocaleString() },
    { label: "Points in circulation", value: circulating.toLocaleString() },
    { label: "Pending redemptions", value: redemptionsPending.toLocaleString() },
  ];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
