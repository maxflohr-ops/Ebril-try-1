import { prisma } from "@/lib/db";
import { RitualForm } from "./RitualForm";
import { DeleteButton } from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminRituals() {
  const rituals = await prisma.ritual.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { claims: true } } },
  });
  const now = new Date();

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 20 }}>rituals</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        time-bound listening prompts. one per active window shows on fan home. fans claim once
        per ritual.
      </p>
      <RitualForm />
      <div style={{ marginTop: 24 }}>
        {rituals.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>no rituals yet.</p>
        )}
        {rituals.map((r) => {
          const live = r.startsAt <= now && r.endsAt >= now;
          return (
            <div
              key={r.id}
              className="admin-surface"
              style={{
                padding: 16,
                marginBottom: 10,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <strong>{r.title}</strong>
                  {live && <span className="chip">live</span>}
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {r.trackTitle ? `♪ ${r.trackTitle} · ` : ""}+{r.pointsReward} pts ·{" "}
                  {r.startsAt.toISOString().slice(0, 16).replace("T", " ")} → {r.endsAt
                    .toISOString()
                    .slice(0, 16)
                    .replace("T", " ")} · {r._count.claims} claimed
                </div>
              </div>
              <DeleteButton id={r.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
