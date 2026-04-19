import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getBalance } from "@/lib/points";
import { getTierProgress } from "@/lib/tiers";
import { BalanceCard } from "@/components/BalanceCard";
import { TierCard } from "@/components/TierCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session.userId) return <Landing />;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return <Landing />;

  const [balance, progress] = await Promise.all([
    getBalance(user.id),
    getTierProgress(user.id),
  ]);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        {user.avatarUrl && (
          <img
            src={user.avatarUrl}
            alt=""
            width={48}
            height={48}
            style={{ borderRadius: 999 }}
          />
        )}
        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Welcome back</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {user.displayName ?? "Ebril Supporter"}
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <BalanceCard balance={balance} />
        <TierCard
          tierName={progress.current?.name ?? null}
          nextTierName={progress.next?.name ?? null}
          progressPct={progress.progressPct}
          monthlyCents={progress.qualifyingCentsPerMonth}
          nextThresholdCents={progress.next?.thresholdCentsPerMonth ?? null}
        />
      </div>

      <section style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 16, color: "var(--text-muted)", fontWeight: 600 }}>
          How to earn
        </h3>
        <ul style={{ lineHeight: 1.8, paddingLeft: 18 }}>
          <li>10 pts per $1 pledged, auto-credited on charge.</li>
          <li>Streak bonuses at 3, 6, and 12 consecutive months.</li>
          <li>Birthday bonus, referral bonus, occasional double-point windows.</li>
        </ul>
      </section>
    </main>
  );
}

function Landing() {
  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: 48,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 12 }}>Ebril Rewards</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
        Link your Patreon to start earning points, unlocking tiers, and redeeming perks.
      </p>
      <Link
        href="/api/auth/patreon"
        style={{
          display: "inline-block",
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          color: "white",
          padding: "14px 24px",
          borderRadius: 999,
          fontWeight: 700,
        }}
      >
        Connect Patreon
      </Link>
    </main>
  );
}
