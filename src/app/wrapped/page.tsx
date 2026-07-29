import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ShareButton } from "./ShareButton";

export const dynamic = "force-dynamic";

// Human labels for the ledger reasons in this recap.
const REASON_LABEL: Record<string, string> = {
  pledge_charge: "pledges",
  campaign_bonus: "campaign bonuses",
  birthday: "birthday",
  referral: "referrals",
  streak: "streak bonuses",
  manual_adjust: "adjustments",
  signup_bonus: "signup",
  stripe_top_up: "top-ups",
  diary_entry: "dusk diary",
  ritual_claim: "rituals",
  clip_approved: "clips",
  show_checkin: "shows",
  gift_received: "gifts received",
  gift_sent: "gifts sent",
};

const MOOD_LABEL: Record<string, string> = {
  dusk: "dusk",
  dawn: "dawn",
  threeam: "3am",
  aching: "aching",
  open: "open",
  alone: "alone",
  together: "together",
  commute: "commute",
};

const MOOD_ACCENT: Record<string, string> = {
  dusk: "#D89B7A",
  dawn: "#D89B7A",
  threeam: "#6B4A5E",
  aching: "#C97064",
  open: "#8BA888",
  alone: "#6B4A5E",
  together: "#D89B7A",
  commute: "#A89A8C",
};

function windowStart(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export default async function WrappedPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const userId = session.userId;
  const since = windowStart();

  const [
    user,
    pointsByReason,
    clipsByStatus,
    diaryEntries,
    ritualsClaimed,
    notesListened,
    giftsSentAgg,
    giftsReceivedAgg,
    tierHistory,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, createdAt: true, currentTier: { select: { name: true } } },
    }),
    prisma.pointTransaction.groupBy({
      by: ["reason"],
      where: { userId, createdAt: { gte: since }, delta: { gt: 0 } },
      _sum: { delta: true },
    }),
    prisma.clip.groupBy({
      by: ["status"],
      where: { userId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.diaryEntry.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { mood: true, createdAt: true, trackTitle: true },
    }),
    prisma.ritualClaim.count({
      where: { userId, claimedAt: { gte: since } },
    }),
    prisma.voiceNoteListen.count({
      where: { userId, completedAt: { gte: since } },
    }),
    prisma.gift.aggregate({
      where: { fromUserId: userId, createdAt: { gte: since } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.gift.aggregate({
      where: { toUserId: userId, createdAt: { gte: since } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.auditLog.findMany({
      where: {
        actorId: "system",
        action: { startsWith: "tier" },
        targetId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);
  if (!user) redirect("/");

  // Total earned this week.
  const totalEarned = pointsByReason.reduce((acc, r) => acc + (r._sum.delta ?? 0), 0);

  // Mood tally.
  const moodCounts = new Map<string, number>();
  for (const e of diaryEntries) {
    moodCounts.set(e.mood, (moodCounts.get(e.mood) ?? 0) + 1);
  }
  const topMoods = Array.from(moodCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const dominantMood = topMoods[0]?.[0] ?? null;

  // Unique days with a diary entry.
  const diaryDays = new Set<string>();
  for (const e of diaryEntries) {
    diaryDays.add(
      `${e.createdAt.getUTCFullYear()}-${e.createdAt.getUTCMonth()}-${e.createdAt.getUTCDate()}`
    );
  }

  // Clip status breakdown.
  const clips = {
    total: clipsByStatus.reduce((a, r) => a + r._count._all, 0),
    kept: clipsByStatus.find((r) => r.status === "approved")?._count._all ?? 0,
    held: clipsByStatus.find((r) => r.status === "featured")?._count._all ?? 0,
    carried: clipsByStatus.find((r) => r.status === "viral")?._count._all ?? 0,
  };

  const diaryPoints =
    pointsByReason.find((r) => r.reason === "diary_entry")?._sum.delta ?? 0;
  const clipPoints =
    pointsByReason.find((r) => r.reason === "clip_approved")?._sum.delta ?? 0;
  const ritualPoints =
    pointsByReason.find((r) => r.reason === "ritual_claim")?._sum.delta ?? 0;

  const shareText = composeShareText({
    dominantMood,
    totalEarned,
    diaryDays: diaryDays.size,
    clipsTotal: clips.total,
    ritualsClaimed,
  });

  // Accent palette follows the week's dominant mood.
  const accent = dominantMood ? MOOD_ACCENT[dominantMood] ?? "#D89B7A" : "#D89B7A";

  const weekLabel = weekRange(since, new Date());

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 96px" }}>
      <div
        className="hero-wash"
        style={{ height: 520, background: `linear-gradient(180deg, #15100E 0%, #2A1A1F 45%, ${accent}44 80%, ${accent}66 100%)` }}
      />

      <header
        style={{
          position: "relative",
          padding: "40px 24px",
          marginBottom: 24,
          textAlign: "center",
          borderRadius: 24,
          overflow: "hidden",
          background: `linear-gradient(160deg, ${accent}33 0%, rgba(107,74,94,0.35) 45%, rgba(21,16,14,0.97) 100%)`,
          border: `1px solid ${accent}44`,
        }}
      >
        <div className="eyebrow" style={{ color: accent }}>
          your week in copula
        </div>
        <h1
          style={{
            marginTop: 10,
            fontSize: 44,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
          }}
        >
          {user.displayName?.toLowerCase() ?? "you"} · {weekLabel}
        </h1>
        <p
          className="serif"
          style={{
            marginTop: 14,
            fontSize: 19,
            color: "var(--text)",
            fontStyle: "italic",
            letterSpacing: "-0.005em",
            maxWidth: 460,
            marginInline: "auto",
            lineHeight: 1.5,
          }}
        >
          {poeticLede({
            diaryDays: diaryDays.size,
            clips,
            rituals: ritualsClaimed,
            mood: dominantMood,
            received: giftsReceivedAgg._count._all ?? 0,
          })}
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Stat
          label="points you earned"
          value={totalEarned.toLocaleString()}
          accent={accent}
          big
        />
        <Stat
          label="days you wrote"
          value={`${diaryDays.size} / 7`}
          accent={accent}
        />
      </section>

      {clips.total > 0 && (
        <section
          className="surface"
          style={{
            padding: 20,
            marginBottom: 16,
            background:
              "linear-gradient(160deg, rgba(216,155,122,0.1) 0%, rgba(30,24,21,0.95) 80%)",
          }}
        >
          <div className="eyebrow">clips</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              marginTop: 12,
            }}
          >
            <MiniStat label="sent" value={clips.total} accent={accent} />
            <MiniStat label="kept" value={clips.kept} accent={accent} />
            <MiniStat label="held" value={clips.held} accent={accent} />
            <MiniStat label="carried" value={clips.carried} accent={accent} />
          </div>
          {clipPoints > 0 && (
            <div style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 13 }}>
              {clipPoints.toLocaleString()} points from what you made.
            </div>
          )}
        </section>
      )}

      {ritualsClaimed > 0 && (
        <section
          className="surface"
          style={{ padding: 20, marginBottom: 16 }}
        >
          <div className="eyebrow">rituals</div>
          <div
            className="serif"
            style={{
              fontSize: 26,
              fontWeight: 500,
              marginTop: 8,
              color: accent,
              letterSpacing: "-0.02em",
            }}
          >
            {ritualsClaimed} press-plays
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
            you showed up for {ritualsClaimed === 1 ? "one" : ritualsClaimed} of my listening
            moments. {ritualPoints > 0 ? `+${ritualPoints.toLocaleString()} pts.` : ""}
          </div>
        </section>
      )}

      {topMoods.length > 0 && (
        <section className="surface" style={{ padding: 20, marginBottom: 16 }}>
          <div className="eyebrow">how the week felt</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            {topMoods.map(([mood, count]) => (
              <div
                key={mood}
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: `${MOOD_ACCENT[mood] ?? "#6B4A5E"}22`,
                  border: `1px solid ${MOOD_ACCENT[mood] ?? "#6B4A5E"}55`,
                  color: MOOD_ACCENT[mood] ?? "var(--accent)",
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>{MOOD_LABEL[mood] ?? mood}</span>
                <span
                  style={{
                    opacity: 0.75,
                    fontFamily: "var(--font-fraunces), Georgia, serif",
                    fontSize: 15,
                    letterSpacing: "-0.01em",
                  }}
                >
                  ×{count}
                </span>
              </div>
            ))}
          </div>
          {diaryPoints > 0 && (
            <div style={{ marginTop: 14, color: "var(--text-muted)", fontSize: 13 }}>
              {diaryPoints.toLocaleString()} points from the pages you kept.
            </div>
          )}
        </section>
      )}

      {(giftsSentAgg._count._all > 0 || giftsReceivedAgg._count._all > 0) && (
        <section className="surface" style={{ padding: 20, marginBottom: 16 }}>
          <div className="eyebrow">gifts</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 10,
            }}
          >
            {giftsReceivedAgg._count._all > 0 && (
              <MiniStat
                label="received"
                value={`${giftsReceivedAgg._count._all} · +${(giftsReceivedAgg._sum.amount ?? 0).toLocaleString()}`}
                accent={accent}
              />
            )}
            {giftsSentAgg._count._all > 0 && (
              <MiniStat
                label="sent"
                value={`${giftsSentAgg._count._all} · −${(giftsSentAgg._sum.amount ?? 0).toLocaleString()}`}
                accent={accent}
              />
            )}
          </div>
        </section>
      )}

      {notesListened > 0 && (
        <section className="surface" style={{ padding: 20, marginBottom: 16 }}>
          <div className="eyebrow">voice notes</div>
          <div
            className="serif"
            style={{
              fontSize: 22,
              fontWeight: 500,
              marginTop: 8,
              color: accent,
            }}
          >
            {notesListened} listened all the way through
          </div>
        </section>
      )}

      {pointsByReason.length > 0 && (
        <section className="surface" style={{ padding: 20, marginBottom: 24 }}>
          <div className="eyebrow">where the points came from</div>
          <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
            {pointsByReason
              .sort((a, b) => (b._sum.delta ?? 0) - (a._sum.delta ?? 0))
              .slice(0, 8)
              .map((r) => {
                const pct = totalEarned > 0 ? ((r._sum.delta ?? 0) / totalEarned) * 100 : 0;
                return (
                  <div key={r.reason}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        fontSize: 13,
                      }}
                    >
                      <span>{REASON_LABEL[r.reason] ?? r.reason}</span>
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        +{(r._sum.delta ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        height: 4,
                        borderRadius: 999,
                        background: "var(--border)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.max(2, pct)}%`,
                          background: accent,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {tierHistory.length > 0 && (
        <section
          className="surface"
          style={{
            padding: 20,
            marginBottom: 24,
            borderColor: `${accent}55`,
          }}
        >
          <div className="eyebrow" style={{ color: accent }}>
            tier movement
          </div>
          <div style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 13 }}>
            {tierHistory.length === 1
              ? "you crossed a threshold this week."
              : `you crossed ${tierHistory.length} thresholds this week.`}{" "}
            now at{" "}
            <span style={{ color: "var(--text)" }}>
              {user.currentTier?.name?.toLowerCase() ?? "unranked"}
            </span>
            .
          </div>
        </section>
      )}

      <section
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: 16,
        }}
      >
        <ShareButton text={shareText} />
        <Link href="/" className="btn btn-ghost">
          back home
        </Link>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
  big,
}: {
  label: string;
  value: string;
  accent: string;
  big?: boolean;
}) {
  return (
    <div className="surface" style={{ padding: 20 }}>
      <div className="eyebrow">{label}</div>
      <div
        className="serif"
        style={{
          fontSize: big ? 44 : 30,
          fontWeight: 500,
          color: accent,
          marginTop: 8,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 12,
        background: "rgba(0,0,0,0.22)",
        border: "1px solid var(--border)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </div>
      <div
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: accent,
          marginTop: 4,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function weekRange(start: Date, end: Date): string {
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  const s = `${months[start.getUTCMonth()]} ${start.getUTCDate()}`;
  const e = `${months[end.getUTCMonth()]} ${end.getUTCDate()}`;
  return `${s} – ${e}`;
}

function poeticLede(s: {
  diaryDays: number;
  clips: { total: number; carried: number };
  rituals: number;
  mood: string | null;
  received: number;
}): string {
  const parts: string[] = [];
  if (s.diaryDays >= 5) parts.push(`you kept ${s.diaryDays} dusks in a row`);
  else if (s.diaryDays >= 2) parts.push(`you wrote on ${s.diaryDays} nights`);
  if (s.clips.carried > 0) {
    parts.push(
      s.clips.carried === 1
        ? "one of yours carried the song"
        : `${s.clips.carried} of your clips carried songs`
    );
  } else if (s.clips.total > 0) {
    parts.push(
      s.clips.total === 1
        ? "you made one for me"
        : `you made ${s.clips.total} for me`
    );
  }
  if (s.rituals >= 3) parts.push(`you pressed play when i asked, ${s.rituals} times`);
  else if (s.rituals >= 1) parts.push("you pressed play when i asked");
  if (s.received > 0) parts.push("someone sent warmth");
  if (parts.length === 0) {
    return "a quiet week. the room held space for you anyway.";
  }
  return parts.join(" · ") + ".";
}

function composeShareText(s: {
  dominantMood: string | null;
  totalEarned: number;
  diaryDays: number;
  clipsTotal: number;
  ritualsClaimed: number;
}): string {
  const bits: string[] = [`my week in copula:`];
  if (s.diaryDays > 0) bits.push(`${s.diaryDays} dusk pages`);
  if (s.clipsTotal > 0) bits.push(`${s.clipsTotal} clips`);
  if (s.ritualsClaimed > 0) bits.push(`${s.ritualsClaimed} rituals`);
  if (s.totalEarned > 0) bits.push(`${s.totalEarned.toLocaleString()} pts`);
  if (s.dominantMood) bits.push(`mostly ${MOOD_LABEL[s.dominantMood] ?? s.dominantMood}`);
  return `${bits[0]} ${bits.slice(1).join(" · ")}`;
}
