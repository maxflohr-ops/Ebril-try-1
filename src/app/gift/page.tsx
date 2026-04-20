import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getBalance } from "@/lib/points";
import { GiftForm } from "./GiftForm";

export const dynamic = "force-dynamic";

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function short(d: Date) {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export default async function GiftPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const [me, balance, sent, received] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { referralCode: true },
    }),
    getBalance(session.userId),
    prisma.gift.findMany({
      where: { fromUserId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.gift.findMany({
      where: { toUserId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const otherIds = Array.from(
    new Set([...sent.map((g) => g.toUserId), ...received.map((g) => g.fromUserId)])
  );
  const others = await prisma.user.findMany({
    where: { id: { in: otherIds } },
    select: { id: true, displayName: true, avatarUrl: true, referralCode: true },
  });
  const oMap = new Map(others.map((o) => [o.id, o]));

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 96px" }}>
      <div className="eyebrow">gift</div>
      <h2 style={{ marginTop: 6 }}>send someone something warm.</h2>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: 15,
          marginTop: 10,
          maxWidth: 460,
          lineHeight: 1.6,
        }}
      >
        give a handful of points to someone else in here. they&rsquo;ll get a quiet note on
        their home screen. minimum 100, max half of what you&rsquo;re holding, three a day.
      </p>

      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "baseline",
          marginTop: 18,
          fontSize: 13,
          color: "var(--text-muted)",
        }}
      >
        <span>
          your balance:{" "}
          <strong style={{ color: "var(--text)" }}>{balance.toLocaleString()}</strong> pts
        </span>
      </div>

      <div style={{ marginTop: 28 }}>
        <GiftForm myReferralCode={me?.referralCode ?? ""} balance={balance} />
      </div>

      {received.length > 0 && (
        <section style={{ marginTop: 44 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            gifts you&rsquo;ve received
          </div>
          {received.map((g) => {
            const other = oMap.get(g.fromUserId);
            return (
              <article
                key={g.id}
                className="surface"
                style={{
                  padding: 16,
                  marginBottom: 10,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 14,
                  alignItems: "center",
                  background:
                    "linear-gradient(160deg, rgba(216,155,122,0.12) 0%, rgba(30,24,21,0.95) 70%)",
                  borderColor: "rgba(216,155,122,0.28)",
                }}
              >
                {other?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={other.avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    style={{ borderRadius: 999 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: "#1E1815",
                      border: "1px solid var(--border)",
                    }}
                  />
                )}
                <div>
                  <div style={{ fontSize: 14 }}>
                    from{" "}
                    <strong>
                      {other?.displayName?.toLowerCase() ?? "someone"}
                    </strong>
                    {" · "}
                    {short(g.createdAt)}
                  </div>
                  {g.note && (
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 13,
                        marginTop: 4,
                        fontStyle: "italic",
                      }}
                    >
                      &ldquo;{g.note}&rdquo;
                    </div>
                  )}
                </div>
                <div
                  className="serif"
                  style={{
                    fontSize: 24,
                    fontWeight: 500,
                    color: "var(--accent)",
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  +{g.amount.toLocaleString()}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {sent.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            gifts you&rsquo;ve sent
          </div>
          {sent.map((g) => {
            const other = oMap.get(g.toUserId);
            return (
              <div
                key={g.id}
                className="surface"
                style={{
                  padding: 14,
                  marginBottom: 10,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 14 }}>
                    to{" "}
                    <strong>
                      {other?.displayName?.toLowerCase() ?? "someone"}
                    </strong>
                    {" · "}
                    <span style={{ color: "var(--text-muted)" }}>{short(g.createdAt)}</span>
                  </div>
                  {g.note && (
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 13,
                        marginTop: 4,
                        fontStyle: "italic",
                      }}
                    >
                      &ldquo;{g.note}&rdquo;
                    </div>
                  )}
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 14,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  −{g.amount.toLocaleString()}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section
        className="surface"
        style={{
          marginTop: 44,
          padding: 20,
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          your own referral code
        </div>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: 14,
            color: "var(--accent)",
            wordBreak: "break-all",
          }}
        >
          {me?.referralCode ?? ""}
        </div>
        <div
          style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}
        >
          share this with the friend who wants to send you points. it&rsquo;s the same code
          that tracks your referral bonus.
        </div>
      </section>
    </main>
  );
}
