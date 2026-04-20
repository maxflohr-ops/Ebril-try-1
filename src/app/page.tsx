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
    <main
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "32px 20px 64px",
        position: "relative",
      }}
    >
      <div className="hero-wash" />
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 36,
        }}
      >
        {user.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            width={44}
            height={44}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(216,155,122,0.35)",
            }}
          />
        )}
        <div>
          <div className="eyebrow">welcome back</div>
          <div
            className="serif"
            style={{ fontSize: 24, fontWeight: 500, marginTop: 2 }}
          >
            {user.displayName?.toLowerCase() ?? "you"}
          </div>
        </div>
      </header>

      <BalanceCard balance={balance} userKey={user.id} />

      <div style={{ marginTop: 20 }}>
        <TierCard
          tierName={progress.current?.name ?? null}
          nextTierName={progress.next?.name ?? null}
          progressPct={progress.progressPct}
          monthlyCents={progress.qualifyingCentsPerMonth}
          nextThresholdCents={progress.next?.thresholdCentsPerMonth ?? null}
          userKey={user.id}
        />
      </div>

      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 32,
          justifyContent: "center",
        }}
      >
        <Link href="/rewards" className="nav-chip">rewards</Link>
        <Link href="/redemptions" className="nav-chip">redemptions</Link>
        <Link href="/points/buy" className="nav-chip">buy points</Link>
        <Link href="/profile" className="nav-chip">profile</Link>
      </nav>

      <section style={{ marginTop: 48 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>how to earn</div>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 12,
            color: "var(--text-muted)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <li>10 points for every dollar pledged, the moment patreon charges.</li>
          <li>small bonuses at 3, 6, and 12 months of staying.</li>
          <li>a little something on your birthday, and when you bring a friend.</li>
        </ul>
      </section>
    </main>
  );
}

function Landing() {
  return (
    <main
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: "96px 24px",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div className="hero-wash" style={{ height: 560 }} />
      <div className="eyebrow" style={{ marginBottom: 18 }}>ebril — rewards</div>
      <h1 style={{ margin: "0 0 18px" }}>
        a small room for the people who live inside the songs.
      </h1>
      <p
        style={{
          color: "var(--text-muted)",
          margin: "0 auto 36px",
          maxWidth: 380,
          fontSize: 15,
        }}
      >
        earn points when you pledge, keep them warm over time, spend them on things i made with you in mind.
      </p>
      <Link href="/api/auth/patreon" className="btn">
        come inside
      </Link>
    </main>
  );
}
