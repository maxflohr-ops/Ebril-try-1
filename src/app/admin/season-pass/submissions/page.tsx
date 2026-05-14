import Link from "next/link";
import { prisma } from "@/lib/db";
import { ModRow } from "./ModRow";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "pending", label: "in queue" },
  { value: "approved", label: "approved" },
  { value: "rejected", label: "returned" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export default async function AdminSeasonPassSubmissions({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = (TABS.find((t) => t.value === searchParams.status)?.value ?? "pending") as Tab;

  const submissions = await prisma.seasonPassSubmission.findMany({
    where: { status: status as never },
    orderBy: status === "pending" ? { createdAt: "asc" } : { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
      reward: {
        select: {
          id: true,
          key: true,
          name: true,
          kind: true,
          season: { select: { id: true, name: true } },
        },
      },
    },
  });

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Link href="/admin/season-pass" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          ← seasons
        </Link>
      </div>
      <h1 className="admin-title" style={{ marginBottom: 16 }}>
        season pass moderation
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
        approving fires the reward grant: the plugin runs the configured{" "}
        <code>on-season-reward.&lt;key&gt;</code> commands on the fan&rsquo;s next login.
        rejecting frees the fan to resubmit with new content.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/season-pass/submissions?status=${t.value}`}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 13,
              background: status === t.value ? "var(--accent)" : "#1A1613",
              color: status === t.value ? "white" : "var(--text-muted)",
              border: "1px solid var(--border)",
              textDecoration: "none",
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {submissions.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>nothing in this bucket.</p>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {submissions.map((s) => (
          <ModRow
            key={s.id}
            id={s.id}
            status={s.status}
            contentType={s.contentType}
            contentBody={s.contentBody}
            createdAt={s.createdAt.toISOString()}
            decidedAt={s.decidedAt?.toISOString() ?? null}
            reviewerNote={s.reviewerNote}
            fan={s.user}
            reward={{
              name: s.reward.name,
              key: s.reward.key,
              kind: s.reward.kind,
              season: s.reward.season.name,
            }}
          />
        ))}
      </div>
    </div>
  );
}
