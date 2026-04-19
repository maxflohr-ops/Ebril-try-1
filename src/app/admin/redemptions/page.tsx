import { prisma } from "@/lib/db";
import { QueueRow } from "./QueueRow";

export const dynamic = "force-dynamic";

export default async function AdminRedemptions({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = searchParams.status ?? "pending";
  const redemptions = await prisma.redemption.findMany({
    where: { status: status as never },
    orderBy: { createdAt: "asc" },
    include: {
      reward: true,
      user: { select: { email: true, displayName: true, avatarUrl: true } },
    },
    take: 200,
  });

  const tabs = ["pending", "approved", "shipped", "delivered", "cancelled"];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Redemption queue</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map((t) => (
          <a
            key={t}
            href={`/admin/redemptions?status=${t}`}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: status === t ? "var(--accent)" : "var(--bg-card)",
              color: status === t ? "white" : "var(--text-muted)",
              border: "1px solid var(--border)",
              fontSize: 13,
            }}
          >
            {t}
          </a>
        ))}
      </div>
      {redemptions.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Nothing in this bucket.</p>
      )}
      {redemptions.map((r) => (
        <QueueRow
          key={r.id}
          id={r.id}
          status={r.status}
          rewardName={r.reward.name}
          rewardType={r.reward.type}
          costPoints={r.costPoints}
          userName={r.user.displayName}
          userEmail={r.user.email}
          shippingAddress={r.shippingAddress as Record<string, string> | null}
          createdAt={r.createdAt.toISOString()}
          notes={r.fulfillmentNotes}
        />
      ))}
    </div>
  );
}
