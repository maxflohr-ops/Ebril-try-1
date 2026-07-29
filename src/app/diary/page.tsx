import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { consecutiveEntryDays, MOOD_LABEL } from "@/lib/diary";
import { DiaryComposer } from "./DiaryComposer";

export const dynamic = "force-dynamic";

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function longDate(d: Date) {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export default async function DiaryPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const [entries, streak] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    consecutiveEntryDays(session.userId),
  ]);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 80px" }}>
      <div className="eyebrow">dusk diary</div>
      <h2 style={{ marginTop: 6 }}>what do the songs sound like tonight?</h2>
      <p
        style={{
          color: "var(--text-muted)",
          maxWidth: 440,
          fontSize: 15,
          marginTop: 10,
        }}
      >
        a small place to put what a song made you feel. yours, unless you hand it to me. one
        entry a day earns 10 points. skipping a day is fine.
      </p>

      {streak > 0 && (
        <div
          style={{
            marginTop: 16,
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          {streak} {streak === 1 ? "day" : "days"} in a row.
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <DiaryComposer />
      </div>

      <div style={{ marginTop: 36 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>past pages</div>
        {entries.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            no pages yet. whenever you&rsquo;re ready.
          </div>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              className="surface"
              style={{ padding: 18, marginBottom: 12 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "var(--text-muted)",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <span>{longDate(e.createdAt)}</span>
                <span>·</span>
                <span>{MOOD_LABEL[e.mood]}</span>
                {e.sharedWithEbril && (
                  <>
                    <span>·</span>
                    <span style={{ color: "var(--accent)" }}>shared with ebril</span>
                  </>
                )}
              </div>
              <div
                className="serif"
                style={{
                  fontSize: 18,
                  fontWeight: 400,
                  marginTop: 10,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}
              >
                {e.text}
              </div>
              {(e.trackTitle || e.trackUrl) && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  {e.trackUrl ? (
                    <a
                      href={e.trackUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ color: "var(--accent)" }}
                    >
                      ♪ {e.trackTitle ?? "the song"}
                    </a>
                  ) : (
                    <>♪ {e.trackTitle}</>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
