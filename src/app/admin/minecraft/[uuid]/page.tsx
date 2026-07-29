import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getBalance } from "@/lib/points";
import { normalizeMcUuid } from "@/lib/minecraft";
import { GrantForm } from "./GrantForm";
import { UnlinkButton } from "./UnlinkButton";

export const dynamic = "force-dynamic";

export default async function AdminMinecraftDetail({
  params,
}: {
  params: { uuid: string };
}) {
  const mcUuid = normalizeMcUuid(params.uuid);
  if (!mcUuid) notFound();

  const account = await prisma.minecraftAccount.findUnique({
    where: { mcUuid },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          currentTier: { select: { name: true, sortOrder: true } },
        },
      },
    },
  });
  if (!account) notFound();

  const [balance, mcGrants, recentTx] = await Promise.all([
    getBalance(account.userId),
    prisma.pointTransaction.findMany({
      where: { userId: account.userId, reason: "minecraft_play" },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.pointTransaction.findMany({
      where: { userId: account.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const mcSum = mcGrants.reduce((acc, t) => acc + t.delta, 0);

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Link href="/admin/minecraft" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          ← all linked accounts
        </Link>
      </div>
      <h1 className="admin-title" style={{ marginBottom: 6 }}>
        {account.mcUsername}
      </h1>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 22 }}>
        linked {account.linkedAt.toISOString().slice(0, 10)}
        {account.lastSeenAt
          ? ` · last seen ${account.lastSeenAt.toISOString().slice(0, 10)}`
          : " · never seen"}
      </div>

      <div
        className="admin-surface"
        style={{
          padding: 18,
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 16,
          alignItems: "center",
        }}
      >
        {account.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.user.avatarUrl}
            alt=""
            width={48}
            height={48}
            style={{ borderRadius: 999 }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              background: "#1E1815",
            }}
          />
        )}
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {account.user.displayName?.toLowerCase() ?? account.user.email ?? account.userId.slice(0, 8)}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
            {account.user.email ?? "—"} · {account.user.currentTier?.name.toLowerCase() ?? "unranked"} ·{" "}
            balance {balance.toLocaleString()}
          </div>
        </div>
        <UnlinkButton mcUuid={mcUuid} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
        <Card label="mc uuid" mono value={mcUuid} />
        <Card label="mc points lifetime" value={mcSum.toLocaleString()} accent />
        <Card label="server grants" value={mcGrants.length.toLocaleString()} />
      </div>

      <h2 style={{ fontSize: 14, marginBottom: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
        push a one-off grant
      </h2>
      <GrantForm mcUuid={mcUuid} mcUsername={account.mcUsername} />

      <h2 style={{ fontSize: 14, marginTop: 28, marginBottom: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
        recent minecraft grants
      </h2>
      {mcGrants.length === 0 ? (
        <div className="admin-surface" style={{ padding: 14, color: "var(--text-muted)", fontSize: 13 }}>
          no grants yet — playtime ticks will land here automatically.
        </div>
      ) : (
        <div className="admin-surface" style={{ padding: 0, overflow: "hidden" }}>
          {mcGrants.map((t) => (
            <div
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                padding: "10px 14px",
                borderTop: "1px solid rgba(255,255,255,0.03)",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: 18,
                  fontWeight: 500,
                  color: "var(--accent)",
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 72,
                  textAlign: "right",
                }}
              >
                +{t.delta.toLocaleString()}
              </span>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 11, color: "var(--text-muted)" }}>
                {t.refId ?? "(no ref)"}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                {t.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 14, marginTop: 28, marginBottom: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
        all recent ledger activity
      </h2>
      <div className="admin-surface" style={{ padding: 0, overflow: "hidden" }}>
        {recentTx.map((t) => (
          <div
            key={t.id}
            style={{
              display: "grid",
              gridTemplateColumns: "auto auto 1fr auto",
              gap: 12,
              padding: "10px 14px",
              borderTop: "1px solid rgba(255,255,255,0.03)",
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <span
              style={{
                fontVariantNumeric: "tabular-nums",
                color: t.delta >= 0 ? "var(--success)" : "var(--danger)",
                minWidth: 64,
                textAlign: "right",
              }}
            >
              {t.delta >= 0 ? "+" : ""}
              {t.delta.toLocaleString()}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{t.reason}</span>
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 11, color: "var(--text-muted)" }}>
              {t.refId ?? ""}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
              {t.createdAt.toISOString().slice(0, 16).replace("T", " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="admin-surface" style={{ padding: 14 }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: mono ? 12 : 22,
          fontWeight: 600,
          marginTop: 6,
          fontFamily: mono ? "ui-monospace, SFMono-Regular, monospace" : undefined,
          color: accent ? "var(--accent)" : undefined,
          wordBreak: mono ? "break-all" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}
