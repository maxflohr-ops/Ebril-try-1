import Link from "next/link";
import { prisma } from "@/lib/db";
import { SeasonForm } from "./SeasonForm";

export const dynamic = "force-dynamic";

export default async function AdminSeasonPassIndex() {
  const [seasons, pendingCount] = await Promise.all([
    prisma.seasonPass.findMany({
      orderBy: [{ active: "desc" }, { startsAt: "desc" }],
      include: { _count: { select: { rewards: true } } },
    }),
    prisma.seasonPassSubmission.count({ where: { status: "pending" } }),
  ]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h1 className="admin-title" style={{ margin: 0 }}>season pass</h1>
        <Link
          href="/admin/season-pass/submissions"
          className="btn"
          style={{ fontSize: 12, padding: "6px 12px" }}
        >
          mod queue
          {pendingCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                background: "var(--danger)",
                color: "white",
                fontSize: 11,
                padding: "1px 7px",
                borderRadius: 999,
              }}
            >
              {pendingCount}
            </span>
          )}
        </Link>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        a time-boxed pass of in-game rewards — costumes, plots of land, titles, items.
        fans submit content to claim each reward; you approve from the mod queue. only
        one season can be active at a time. the plugin reads grants on login and runs
        the matching <code>on-season-reward.&lt;key&gt;</code> commands from{" "}
        <code>plugins/copula/config.yml</code>.
      </p>

      <SeasonForm />

      <div style={{ marginTop: 24 }}>
        {seasons.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>no seasons yet.</p>
        )}
        {seasons.map((s) => (
          <Link
            key={s.id}
            href={`/admin/season-pass/${s.id}`}
            className="admin-surface"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              padding: 16,
              marginBottom: 10,
              gap: 12,
              alignItems: "center",
              opacity: s.active ? 1 : 0.55,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <strong>{s.name}</strong>
                {s.active && <span className="chip">live</span>}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                /season-pass · {s._count.rewards} rewards ·{" "}
                {s.startsAt.toISOString().slice(0, 10)} → {s.endsAt.toISOString().slice(0, 10)}
              </div>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>edit →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
