import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { consecutiveChargeMonths, STREAK_REWARDS } from "@/lib/streaks";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      dob: true,
      referralCode: true,
      _count: { select: { referrals: true } },
    },
  });
  if (!user) redirect("/");

  const streak = await consecutiveChargeMonths(user.id);
  const baseUrl = process.env.APP_BASE_URL ?? "";
  const referralUrl = `${baseUrl.replace(/\/$/, "")}/r/${user.referralCode}`;

  const nextStreak = Object.keys(STREAK_REWARDS)
    .map(Number)
    .sort((a, b) => a - b)
    .find((m) => m > streak);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Profile</h1>

      <section
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Streak
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
          {streak} {streak === 1 ? "month" : "months"}
        </div>
        {nextStreak && (
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            {nextStreak - streak} more month{nextStreak - streak === 1 ? "" : "s"} to unlock the{" "}
            {STREAK_REWARDS[nextStreak]} pt streak bonus.
          </div>
        )}
      </section>

      <section
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Referral link
        </div>
        <div
          style={{
            marginTop: 8,
            padding: 10,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: 13,
            wordBreak: "break-all",
          }}
        >
          {referralUrl}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
          Earn 500 pts the first time someone you referred pledges. {user._count.referrals}{" "}
          referred so far.
        </div>
      </section>

      <ProfileForm
        initialDob={user.dob ? user.dob.toISOString().slice(0, 10) : ""}
        email={user.email}
        displayName={user.displayName}
      />
    </main>
  );
}
