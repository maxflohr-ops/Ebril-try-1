import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { AudioPlayer } from "@/components/AudioPlayer";

export const dynamic = "force-dynamic";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function longDate(d: Date) {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export default async function NotesPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { currentTier: { select: { name: true, sortOrder: true } } },
  });
  const userSort = user?.currentTier?.sortOrder ?? 0;

  const notes = await prisma.voiceNote.findMany({
    where: { active: true },
    orderBy: { publishedAt: "desc" },
    include: {
      tierRequired: { select: { name: true, sortOrder: true } },
    },
  });

  const listens = await prisma.voiceNoteListen.findMany({
    where: { userId: session.userId },
    select: { voiceNoteId: true, completedAt: true },
  });
  const listenMap = new Map(listens.map((l) => [l.voiceNoteId, l]));

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>
      <div className="eyebrow">voice notes</div>
      <h2 style={{ marginTop: 6 }}>small things i want you to hear.</h2>
      <p
        style={{
          color: "var(--text-muted)",
          maxWidth: 440,
          marginTop: 10,
          fontSize: 15,
        }}
      >
        half-minute thoughts, demos, hallway recordings, new verses. nothing polished.
        meant for the people who are already here.
      </p>

      <div style={{ marginTop: 28 }}>
        {notes.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>
            nothing yet. i&rsquo;ll leave some soon.
          </p>
        )}

        {notes.map((n) => {
          const unlocked = !n.tierRequired || userSort >= n.tierRequired.sortOrder;
          const listened = !!listenMap.get(n.id)?.completedAt;
          return (
            <article key={n.id} style={{ marginBottom: 22 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  color: "var(--text-muted)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                <span>{longDate(n.publishedAt)}</span>
                {n.tierRequired && (
                  <>
                    <span>·</span>
                    <span style={{ color: "var(--accent)" }}>
                      {n.tierRequired.name.toLowerCase()}
                    </span>
                  </>
                )}
                {listened && (
                  <>
                    <span>·</span>
                    <span style={{ color: "var(--success)" }}>listened</span>
                  </>
                )}
              </div>
              <div
                className="serif"
                style={{
                  fontSize: 24,
                  fontWeight: 500,
                  lineHeight: 1.25,
                  marginBottom: 8,
                  opacity: unlocked ? 1 : 0.55,
                }}
              >
                {n.title.toLowerCase()}
              </div>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  marginBottom: 14,
                  whiteSpace: "pre-wrap",
                  opacity: unlocked ? 1 : 0.55,
                }}
              >
                {n.caption}
              </p>
              {unlocked ? (
                <AudioPlayer
                  noteId={n.id}
                  audioUrl={n.audioUrl}
                  durationSec={n.durationSec}
                />
              ) : (
                <div
                  className="surface"
                  style={{
                    padding: 24,
                    textAlign: "center",
                    background:
                      "linear-gradient(160deg, rgba(107,74,94,0.25) 0%, rgba(30,24,21,0.9) 70%)",
                  }}
                >
                  <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                    this one opens at{" "}
                    <span style={{ color: "var(--accent)" }}>
                      {n.tierRequired?.name.toLowerCase()}
                    </span>
                    . it&rsquo;s here when you get there.
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
