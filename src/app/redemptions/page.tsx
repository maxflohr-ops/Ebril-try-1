import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "with me",
  approved: "packed",
  shipped: "on the way",
  delivered: "yours",
  cancelled: "returned",
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
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 64px" }}>
      <div className="eyebrow">redemptions</div>
      <h2 style={{ marginTop: 6, marginBottom: 28 }}>what you&rsquo;ve claimed</h2>

      {redemptions.length === 0 ? (
        <div
          className="surface"
          style={{ padding: 64, textAlign: "center" }}
        >
          <div
            className="serif"
            style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}
          >
            nothing redeemed yet.
          </div>
          <p style={{ color: "var(--text-muted)", margin: "0 auto 24px", maxWidth: 320 }}>
            the rewards are waiting whenever you&rsquo;re ready.
          </p>
          <Link href="/rewards" className="btn btn-ghost">
            see what&rsquo;s there
          </Link>
        </div>
      ) : (
        redemptions.map((r) => (
          <div
            key={r.id}
            className="surface"
            style={{
              padding: 18,
              marginBottom: 12,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div>
              <div
                className="serif"
                style={{ fontSize: 18, fontWeight: 500 }}
              >
                {r.reward.name}
              </div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                {r.costPoints > 0
                  ? `${r.costPoints.toLocaleString()} points · `
                  : "purchased · "}
                {r.createdAt.toISOString().slice(0, 10)}
              </div>
              {r.fulfillmentNotes && (
                <div style={{ fontSize: 13, marginTop: 8, color: "var(--text-muted)" }}>
                  {r.fulfillmentNotes}
                </div>
              )}
            </div>
            <span
              className={
                r.status === "cancelled"
                  ? "chip chip-danger"
                  : r.status === "delivered"
                    ? "chip chip-success"
                    : "chip"
              }
            >
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          </div>
        ))
      )}
    </main>
  );
}
