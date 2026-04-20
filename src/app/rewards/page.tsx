import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getBalance } from "@/lib/points";
import { RewardGrid } from "./RewardGrid";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { currentTier: { select: { sortOrder: true } } },
  });

  const [rewards, balance] = await Promise.all([
    prisma.reward.findMany({
      where: { active: true },
      orderBy: { costPoints: "asc" },
      include: { tierRequired: { select: { name: true, sortOrder: true } } },
    }),
    getBalance(session.userId),
  ]);

  const userSort = user?.currentTier?.sortOrder ?? 0;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>Rewards</h1>
        <div style={{ color: "var(--text-muted)" }}>
          Balance: <strong style={{ color: "var(--text)" }}>{balance.toLocaleString()}</strong> pts
        </div>
      </div>
      <RewardGrid
        rewards={rewards.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          imageUrl: r.imageUrl,
          costPoints: r.costPoints,
          cashPriceCents: r.cashPriceCents,
          stock: r.stock,
          type: r.type,
          tierRequired: r.tierRequired,
          affordable: balance >= r.costPoints,
          tierUnlocked: !r.tierRequired || userSort >= r.tierRequired.sortOrder,
        }))}
      />
    </main>
  );
}
