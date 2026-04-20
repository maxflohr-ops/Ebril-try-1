import { prisma } from "@/lib/db";
import { SongForm } from "./SongForm";
import { ArchiveButton } from "./ArchiveButton";
import { DropNotifyButton } from "./DropNotifyButton";

export const dynamic = "force-dynamic";

export default async function AdminSongs() {
  const songs = await prisma.song.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { releaseDate: "desc" }],
  });

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 20 }}>songs</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        each song gets its own lyric page. split verses with a blank line. links open the
        real apps on mobile.
      </p>
      <SongForm />
      <div style={{ marginTop: 24 }}>
        {songs.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>no songs yet.</p>
        )}
        {songs.map((s) => (
          <div
            key={s.id}
            className="admin-surface"
            style={{
              padding: 14,
              marginBottom: 8,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 12,
              opacity: s.active ? 1 : 0.5,
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>
                {s.title}
                {!s.active && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)" }}>
                    (archived)
                  </span>
                )}
              </div>
              <div
                style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}
              >
                /songs/{s.slug}
                {s.album ? ` · ${s.album}` : ""}
                {s.releaseDate ? ` · ${s.releaseDate.toISOString().slice(0, 10)}` : ""}
              </div>
            </div>
            {s.active && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <DropNotifyButton id={s.id} title={s.title} />
                <ArchiveButton id={s.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
