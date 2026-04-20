import { prisma } from "@/lib/db";
import { DirectionForm } from "./DirectionForm";
import { ArchiveButton } from "./ArchiveButton";

export const dynamic = "force-dynamic";

export default async function AdminDirections() {
  const [directions, eras, songs] = await Promise.all([
    prisma.clippingBrief.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      include: {
        era: { select: { name: true, accentColor: true, isCurrent: true } },
        song: { select: { title: true } },
        _count: { select: { clips: true } },
      },
    }),
    prisma.era.findMany({
      where: { active: true },
      orderBy: [{ isCurrent: "desc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, accentColor: true, isCurrent: true },
    }),
    prisma.song.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 20 }}>directions</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        creative prompts inside an era. fans make a clip, you moderate it. ladder points
        must go up: approved &lt; featured &lt; viral.
      </p>
      {eras.length === 0 ? (
        <div
          className="admin-surface"
          style={{ padding: 16, color: "var(--text-muted)", fontSize: 14 }}
        >
          create an era first.
        </div>
      ) : (
        <DirectionForm eras={eras} songs={songs} />
      )}
      <div style={{ marginTop: 24 }}>
        {directions.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>no directions yet.</p>
        )}
        {directions.map((d) => (
          <div
            key={d.id}
            className="admin-surface"
            style={{
              padding: 16,
              marginBottom: 10,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 12,
              opacity: d.active ? 1 : 0.5,
            }}
          >
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{d.title}</strong>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: d.era.accentColor,
                  }}
                >
                  {d.era.name.toLowerCase()}
                </span>
                {d.era.isCurrent && <span className="chip">current</span>}
                {!d.active && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>archived</span>
                )}
              </div>
              <div
                style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}
              >
                {d.song ? `♪ ${d.song.title} · ` : ""}
                {d._count.clips} clips · kept +{d.pointsApproved} · held +{d.pointsFeatured}{" "}
                · carried +{d.pointsViral}
              </div>
            </div>
            {d.active && <ArchiveButton id={d.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
