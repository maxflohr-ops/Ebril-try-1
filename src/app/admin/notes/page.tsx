import { prisma } from "@/lib/db";
import { NoteForm } from "./NoteForm";
import { ArchiveButton } from "./ArchiveButton";

export const dynamic = "force-dynamic";

export default async function AdminNotes() {
  const [notes, tiers] = await Promise.all([
    prisma.voiceNote.findMany({
      orderBy: { publishedAt: "desc" },
      include: {
        tierRequired: { select: { name: true } },
        _count: { select: { listens: true } },
      },
    }),
    prisma.tier.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 20 }}>voice notes</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        half-minute audio drops for fans. paste an mp3/m4a url (s3, r2, vercel blob).
        tier-gated notes only render for fans at that tier or above.
      </p>
      <NoteForm tiers={tiers.map((t) => ({ id: t.id, name: t.name }))} />
      <div style={{ marginTop: 24 }}>
        {notes.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>no voice notes yet.</p>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className="admin-surface"
            style={{
              padding: 16,
              marginBottom: 10,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 12,
              opacity: n.active ? 1 : 0.5,
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>
                {n.title}
                {!n.active && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)" }}>
                    (archived)
                  </span>
                )}
              </div>
              <div
                style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}
              >
                {Math.floor(n.durationSec / 60)}:{String(n.durationSec % 60).padStart(2, "0")}
                {n.tierRequired ? ` · gated: ${n.tierRequired.name}` : ""} · {n._count.listens}{" "}
                listens · {n.publishedAt.toISOString().slice(0, 10)}
              </div>
            </div>
            {n.active && <ArchiveButton id={n.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
