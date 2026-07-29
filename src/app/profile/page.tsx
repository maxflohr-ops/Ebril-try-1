import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { consecutiveChargeMonths, STREAK_REWARDS } from "@/lib/streaks";
import { ProfileForm } from "./ProfileForm";
import { PushToggle } from "@/components/PushToggle";
import { MinecraftCard } from "@/components/MinecraftCard";
import { DiscordCard } from "@/components/DiscordCard";
import { isConfigured as msIsConfigured } from "@/lib/minecraftMicrosoft";
import {
  isConfigured as discordIsConfigured,
  avatarUrl as discordAvatarUrl,
} from "@/lib/discord";
import { isBotConfigured as discordBotConfigured } from "@/lib/discordBot";

export const dynamic = "force-dynamic";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function longhandDate(d: Date) {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { mc?: string; discord?: string };
}) {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      dob: true,
      referralCode: true,
      createdAt: true,
      currentTier: { select: { name: true, sortOrder: true } },
      _count: { select: { referrals: true } },
    },
  });
  if (!user) redirect("/");

  const [streak, earnedAgg, recentGifts, mcAccount, activeLinkCode, discordAccount] = await Promise.all([
    consecutiveChargeMonths(user.id),
    prisma.pointTransaction.aggregate({
      _sum: { delta: true },
      where: { userId: user.id, delta: { gt: 0 } },
    }),
    prisma.gift.findMany({
      where: { toUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.minecraftAccount.findUnique({ where: { userId: user.id } }),
    prisma.minecraftLinkCode.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.discordAccount.findUnique({ where: { userId: user.id } }),
  ]);
  const giftSenderIds = Array.from(new Set(recentGifts.map((g) => g.fromUserId)));
  const giftSenders = giftSenderIds.length
    ? await prisma.user.findMany({
        where: { id: { in: giftSenderIds } },
        select: { id: true, displayName: true, avatarUrl: true },
      })
    : [];
  const giftSenderMap = new Map(giftSenders.map((g) => [g.id, g]));
  const totalEarned = earnedAgg._sum.delta ?? 0;
  const baseUrl = process.env.APP_BASE_URL ?? "";
  const referralUrl = `${baseUrl.replace(/\/$/, "")}/r/${user.referralCode}`;

  const nextStreak = Object.keys(STREAK_REWARDS)
    .map(Number)
    .sort((a, b) => a - b)
    .find((m) => m > streak);

  const isTop = (user.currentTier?.sortOrder ?? 0) >= 3;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        {user.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            width={96}
            height={96}
            style={{
              borderRadius: 999,
              border: isTop
                ? "1px solid rgba(216,155,122,0.75)"
                : "1px solid rgba(255,255,255,0.06)",
              boxShadow: isTop
                ? "0 0 24px -4px rgba(216,155,122,0.35)"
                : "none",
            }}
          />
        )}
        <h2
          style={{
            marginTop: 16,
            fontSize: 30,
            fontWeight: 500,
          }}
        >
          {user.displayName?.toLowerCase() ?? "you"}
        </h2>
        {user.currentTier && (
          <div style={{ marginTop: 8 }}>
            <span className="chip">{user.currentTier.name.toLowerCase()}</span>
          </div>
        )}
        <div style={{ marginTop: 14, color: "var(--text-muted)", fontSize: 14 }}>
          with ebril since {longhandDate(user.createdAt)}
        </div>
      </div>

      <div
        className="surface"
        style={{ padding: 20, marginBottom: 16, textAlign: "center" }}
      >
        <div className="eyebrow">you&rsquo;ve earned, all time</div>
        <div
          className="serif"
          style={{
            fontSize: 44,
            fontWeight: 500,
            color: "var(--accent)",
            marginTop: 10,
            letterSpacing: "-0.02em",
          }}
        >
          {totalEarned.toLocaleString()}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          points across the whole story
        </div>
      </div>

      <div className="surface" style={{ padding: 20, marginBottom: 16 }}>
        <div className="eyebrow">streak</div>
        <div
          className="serif"
          style={{ fontSize: 26, fontWeight: 500, marginTop: 8 }}
        >
          {streak} {streak === 1 ? "month" : "months"} in a row
        </div>
        {nextStreak && (
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
            {nextStreak - streak} more {nextStreak - streak === 1 ? "month" : "months"} unlocks a{" "}
            {STREAK_REWARDS[nextStreak]}-point letter.
          </div>
        )}
      </div>

      <PushToggle />

      <MinecraftCard
        initialAccount={
          mcAccount
            ? {
                mcUsername: mcAccount.mcUsername,
                linkedAt: mcAccount.linkedAt.toISOString(),
                lastSeenAt: mcAccount.lastSeenAt?.toISOString() ?? null,
              }
            : null
        }
        initialCode={
          activeLinkCode
            ? {
                code: activeLinkCode.code,
                expiresAt: activeLinkCode.expiresAt.toISOString(),
              }
            : null
        }
        microsoftAvailable={msIsConfigured()}
        flashStatus={searchParams.mc ?? null}
      />

      <DiscordCard
        initialAccount={
          discordAccount
            ? {
                username: discordAccount.username,
                globalName: discordAccount.globalName,
                avatarUrl: discordAvatarUrl(discordAccount.discordUserId, discordAccount.avatarHash),
                linkedAt: discordAccount.linkedAt.toISOString(),
              }
            : null
        }
        available={discordIsConfigured()}
        botActive={discordBotConfigured()}
        flashStatus={searchParams.discord ?? null}
      />

      {recentGifts.length > 0 && (
        <div
          className="surface"
          style={{
            padding: 20,
            marginBottom: 16,
            background:
              "linear-gradient(160deg, rgba(216,155,122,0.12) 0%, rgba(30,24,21,0.95) 70%)",
            borderColor: "rgba(216,155,122,0.28)",
          }}
        >
          <div className="eyebrow" style={{ color: "var(--accent)" }}>
            recent gifts from the room
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {recentGifts.map((g) => {
              const s = giftSenderMap.get(g.fromUserId);
              return (
                <div
                  key={g.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  {s?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.avatarUrl}
                      alt=""
                      width={30}
                      height={30}
                      style={{ borderRadius: 999 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        background: "#1E1815",
                      }}
                    />
                  )}
                  <div>
                    <div style={{ fontSize: 14 }}>
                      {s?.displayName?.toLowerCase() ?? "someone"}
                    </div>
                    {g.note && (
                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: 12,
                          fontStyle: "italic",
                          marginTop: 2,
                        }}
                      >
                        &ldquo;{g.note}&rdquo;
                      </div>
                    )}
                  </div>
                  <div
                    className="serif"
                    style={{
                      fontSize: 18,
                      fontWeight: 500,
                      color: "var(--accent)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    +{g.amount.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="surface" style={{ padding: 20, marginBottom: 16 }}>
        <div className="eyebrow">bring someone in</div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 10 }}>
          share this link. the first time they pledge, a little thank-you shows up here.
        </p>
        <div
          style={{
            marginTop: 12,
            padding: "12px 14px",
            background: "rgba(0,0,0,0.2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: 13,
            wordBreak: "break-all",
            color: "var(--text-muted)",
          }}
        >
          {referralUrl}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 10 }}>
          {user._count.referrals} so far.
        </div>
      </div>

      <ProfileForm
        initialDob={user.dob ? user.dob.toISOString().slice(0, 10) : ""}
        email={user.email}
        displayName={user.displayName}
      />
    </main>
  );
}
