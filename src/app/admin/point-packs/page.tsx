import { prisma } from "@/lib/db";
import { PointPackForm } from "./PointPackForm";
import { ArchiveButton } from "./ArchiveButton";

export const dynamic = "force-dynamic";

export default async function AdminPointPacks() {
  const packs = await prisma.pointPack.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { priceCents: "asc" }],
  });
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Point packs</h2>
      <PointPackForm />
      <div style={{ marginTop: 24 }}>
        {packs.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>No packs yet.</p>
        )}
        {packs.map((p) => (
          <div
            key={p.id}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              opacity: p.active ? 1 : 0.5,
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>
                {p.name}
                {!p.active && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    (archived)
                  </span>
                )}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                {p.points.toLocaleString()} pts · ${(p.priceCents / 100).toFixed(2)}{" "}
                {p.currency}
              </div>
            </div>
            {p.active && <ArchiveButton id={p.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
