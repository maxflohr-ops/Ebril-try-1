import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MOOD_LABEL: Record<string, string> = {
  dusk: "dusk",
  dawn: "dawn",
  threeam: "3am",
  aching: "aching",
  open: "open",
  alone: "alone",
  together: "together",
  commute: "commute",
};

export default async function SharedDiary() {
  const entries = await prisma.diaryEntry.findMany({
    where: { sharedWithEbril: true },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      // leverage denormalized user lookup
    },
  });
  const userIds = Array.from(new Set(entries.map((e) => e.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, email: true },
  });
  const uMap = new Map(users.map((u) => [u.id, u]));

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 8 }}>shared diary</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        pages fans chose to send you. read slowly.
      </p>
      {entries.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>nothing shared yet.</p>
      )}
      {entries.map((e) => {
        const u = uMap.get(e.userId);
        return (
          <div
            key={e.id}
            className="admin-surface"
            style={{ padding: 18, marginBottom: 12 }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                color: "var(--text-muted)",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <span>{e.createdAt.toISOString().slice(0, 10)}</span>
              <span>·</span>
              <span>{MOOD_LABEL[e.mood] ?? e.mood}</span>
              <span>·</span>
              <span>{u?.displayName?.toLowerCase() ?? u?.email ?? "anon"}</span>
            </div>
            <div
              className="serif"
              style={{
                fontSize: 16,
                marginTop: 10,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {e.text}
            </div>
            {e.trackTitle && (
              <div style={{ marginTop: 10, fontSize: 13, color: "var(--accent)" }}>
                ♪ {e.trackTitle}
                {e.trackUrl && (
                  <>
                    {" "}·{" "}
                    <a
                      href={e.trackUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ color: "var(--accent)" }}
                    >
                      link
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
