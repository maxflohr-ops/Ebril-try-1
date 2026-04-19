import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending approval",
  approved: "Approved",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default async function RedemptionsPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const redemptions = await prisma.redemption.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: { reward: true },
  });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>My redemptions</h1>
      {redemptions.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Nothing yet. Hit the rewards page to spend points.</p>
      )}
      {redemptions.map((r) => (
        <div
          key={r.id}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            display: "grid",
            gridTemplateColumns: "1fr auto",
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{r.reward.name}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {r.costPoints.toLocaleString()} pts · {r.createdAt.toISOString().slice(0, 10)}
            </div>
            {r.fulfillmentNotes && (
              <div style={{ fontSize: 13, marginTop: 4 }}>{r.fulfillmentNotes}</div>
            )}
          </div>
          <div style={{ alignSelf: "center", fontSize: 13 }}>
            {STATUS_LABEL[r.status] ?? r.status}
          </div>
        </div>
      ))}
    </main>
  );
}
