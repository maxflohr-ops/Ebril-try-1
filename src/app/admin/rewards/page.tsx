import { prisma } from "@/lib/db";
import { RewardForm } from "./RewardForm";
import { ConfirmActionButton } from "@/components/ConfirmActionButton";

export const dynamic = "force-dynamic";

export default async function AdminRewards() {
  const [rewards, tiers] = await Promise.all([
    prisma.reward.findMany({
      orderBy: [{ active: "desc" }, { costPoints: "asc" }],
      include: { tierRequired: { select: { name: true } } },
    }),
    prisma.tier.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Rewards catalog</h2>
      <RewardForm tiers={tiers.map((t) => ({ id: t.id, name: t.name }))} />
      <div style={{ marginTop: 24 }}>
        {rewards.map((r) => (
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
              alignItems: "center",
              opacity: r.active ? 1 : 0.5,
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>
                {r.name}{" "}
                {!r.active && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(archived)</span>
                )}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
                {r.costPoints.toLocaleString()} pts · {r.type}
                {r.tierRequired ? ` · gated: ${r.tierRequired.name}` : ""}
                {r.stock !== null ? ` · stock: ${r.stock}` : ""}
              </div>
            </div>
            {r.active && (
              <ConfirmActionButton
                endpoint={`/api/admin/rewards/${r.id}`}
                confirm="archive this reward? fans won't see it anymore."
                label="archive"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
