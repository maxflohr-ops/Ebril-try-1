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
    { label: "users", value: userCount.toLocaleString() },
    { label: "active pledges", value: activePledges.toLocaleString() },
    { label: "points in circulation", value: circulating.toLocaleString() },
    { label: "pending redemptions", value: redemptionsPending.toLocaleString() },
  ];

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 20 }}>dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
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
    </div>
  );
}
