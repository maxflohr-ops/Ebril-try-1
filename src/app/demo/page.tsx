import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isDemoMode, DEMO_PATREON_IDS } from "@/lib/demo";
import { getBalance } from "@/lib/points";

export const dynamic = "force-dynamic";

export default async function DemoLanding() {
  if (!isDemoMode()) notFound();

  const fans = await prisma.user.findMany({
    where: { patreonUserId: { in: DEMO_PATREON_IDS as unknown as string[] } },
    select: {
      id: true,
      patreonUserId: true,
      displayName: true,
      email: true,
      avatarUrl: true,
      currentTier: { select: { name: true } },
    },
  });

  const byId: Record<string, (typeof fans)[number]> = Object.fromEntries(
    fans.map((f) => [f.patreonUserId, f])
  );

  const balances = await Promise.all(
    fans.map(async (f) => [f.id, await getBalance(f.id)] as const)
  );
  const balanceMap = new Map(balances);

  if (fans.length === 0) {
    return (
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "64px 24px" }}>
        <div className="eyebrow" style={{ color: "var(--accent)" }}>
          copula · demo
        </div>
        <h1 style={{ fontSize: 36, marginTop: 12 }}>
          the demo fans haven&rsquo;t been seeded yet.
        </h1>
        <pre
          style={{
            marginTop: 20,
            padding: 14,
            background: "rgba(0,0,0,0.35)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 13,
            overflowX: "auto",
          }}
        >
          {`npx prisma db push\nnpx tsx prisma/seed.ts\nnpx tsx prisma/seed-demo.ts`}
        </pre>
        <p style={{ color: "var(--text-muted)", marginTop: 16 }}>
          then refresh this page.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px 96px" }}>
      <div className="eyebrow" style={{ color: "var(--accent)" }}>
        copula · demo
      </div>
      <h1 style={{ fontSize: 40, marginTop: 10, letterSpacing: "-0.02em" }}>
        sign in as any of these.
      </h1>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: 15,
          marginTop: 10,
          maxWidth: 520,
          lineHeight: 1.6,
        }}
      >
        demo mode is on (<code>DEMO_MODE=1</code>). each card below drops you straight into
        the app as a pre-seeded fan — no patreon oauth, no email. use the yellow bar at
        the top of any page to switch fans or sign out.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 14,
          marginTop: 32,
        }}
      >
        {DEMO_PATREON_IDS.map((id) => {
          const fan = byId[id];
          if (!fan) return null;
          return (
            <Link
              key={id}
              href={`/api/demo/sign-in?as=${encodeURIComponent(id)}`}
              className="surface"
              style={{
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                textDecoration: "none",
                color: "inherit",
                transition: "transform 200ms var(--ease), border-color 200ms var(--ease)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {fan.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fan.avatarUrl}
                    alt=""
                    width={44}
                    height={44}
                    style={{
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "#1E1815",
                    }}
                  />
                )}
                <div>
                  <div
                    className="serif"
                    style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.1 }}
                  >
                    {fan.displayName?.toLowerCase() ?? "fan"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    {fan.currentTier?.name.toLowerCase() ?? "unranked"}
                  </div>
                </div>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                balance{" "}
                <strong style={{ color: "var(--accent)" }}>
                  {(balanceMap.get(fan.id) ?? 0).toLocaleString()}
                </strong>{" "}
                pts
              </div>
              <div
                style={{
                  marginTop: "auto",
                  color: "var(--accent)",
                  fontSize: 13,
                  letterSpacing: "0.08em",
                }}
              >
                sign in →
              </div>
            </Link>
          );
        })}
      </div>

      <section
        className="surface"
        style={{ marginTop: 40, padding: 20 }}
      >
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          admin
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>
          set <code>ADMIN_PATREON_IDS=demo-mars</code> (or any demo id) in your env to
          unlock <Link href="/admin" style={{ color: "var(--accent)" }}>/admin</Link> for
          that fan. mars is the recommended admin because their seeded history includes
          clips, shows, and pledges.
        </p>
      </section>
    </main>
  );
}
