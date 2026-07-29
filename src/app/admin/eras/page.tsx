import { prisma } from "@/lib/db";
import { EraForm } from "./EraForm";
import { EraActions } from "./EraActions";

export const dynamic = "force-dynamic";

export default async function AdminEras() {
  const eras = await prisma.era.findMany({
    orderBy: [{ active: "desc" }, { isCurrent: "desc" }, { sortOrder: "asc" }],
    include: { _count: { select: { directions: true } } },
  });

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 20 }}>eras</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        a world with its own palette + directions. only one can be current at a time.
      </p>
      <EraForm />
      <div style={{ marginTop: 24 }}>
        {eras.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>no eras yet.</p>
        )}
        {eras.map((e) => (
          <div
            key={e.id}
            className="admin-surface"
            style={{
              padding: 16,
              marginBottom: 10,
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 14,
              alignItems: "center",
              opacity: e.active ? 1 : 0.5,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${e.accentColor}, ${e.secondaryColor})`,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <strong>{e.name}</strong>
                {e.isCurrent && <span className="chip">current</span>}
                {!e.active && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>archived</span>
                )}
              </div>
              <div
                style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}
              >
                /eras/{e.slug} · {e._count.directions} directions
                {e.startsAt ? ` · from ${e.startsAt.toISOString().slice(0, 10)}` : ""}
                {e.endsAt ? ` to ${e.endsAt.toISOString().slice(0, 10)}` : ""}
              </div>
            </div>
            <EraActions id={e.id} isCurrent={e.isCurrent} active={e.active} />
          </div>
        ))}
      </div>
    </div>
  );
}
