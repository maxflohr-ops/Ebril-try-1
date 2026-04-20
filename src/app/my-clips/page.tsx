import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "with me",
  approved: "kept",
  featured: "held",
  viral: "carried",
  rejected: "returned",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "chip",
  approved: "chip",
  featured: "chip chip-success",
  viral: "chip chip-success",
  rejected: "chip chip-danger",
};

export default async function MyClips() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const clips = await prisma.clip.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      brief: {
        select: {
          id: true,
          title: true,
          era: { select: { name: true, slug: true, accentColor: true } },
        },
      },
    },
  });

  const totalAwarded = clips.reduce((sum, c) => sum + c.pointsAwarded, 0);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 96px" }}>
      <div className="eyebrow">your clips</div>
      <h2 style={{ marginTop: 6 }}>the takes you&rsquo;ve sent me.</h2>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: 15,
          marginTop: 10,
          maxWidth: 440,
        }}
      >
        everything you&rsquo;ve made for a direction. i look at these personally. it takes a
        minute sometimes — thank you for making them.
      </p>
      {clips.length > 0 && (
        <div
          style={{
            marginTop: 14,
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          {clips.length} takes · {totalAwarded.toLocaleString()} points earned
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        {clips.length === 0 ? (
          <div
            className="surface"
            style={{ padding: 32, textAlign: "center" }}
          >
            <div
              className="serif"
              style={{ fontSize: 20, fontWeight: 500 }}
            >
              nothing sent yet.
            </div>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 14,
                marginTop: 8,
                marginBottom: 20,
              }}
            >
              pick a direction, make something, send it here.
            </p>
            <Link href="/eras" className="btn">
              find a direction
            </Link>
          </div>
        ) : (
          clips.map((c) => (
            <article
              key={c.id}
              className="surface"
              style={{
                padding: 18,
                marginBottom: 12,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 16,
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: c.brief.era.accentColor,
                  }}
                >
                  {c.brief.era.name.toLowerCase()}
                </div>
                <Link
                  href={`/clip/${c.brief.id}`}
                  style={{
                    display: "block",
                    marginTop: 4,
                    fontFamily: "var(--font-fraunces), Georgia, serif",
                    fontSize: 18,
                    fontWeight: 500,
                    color: "var(--text)",
                    textDecoration: "none",
                  }}
                >
                  {c.brief.title.toLowerCase()}
                </Link>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{
                    marginTop: 6,
                    display: "inline-block",
                    color: "var(--text-muted)",
                    fontSize: 12,
                    wordBreak: "break-all",
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  }}
                >
                  {c.url}
                </a>
                {c.rejectedReason && (
                  <div
                    style={{
                      marginTop: 8,
                      color: "var(--text-muted)",
                      fontSize: 13,
                      fontStyle: "italic",
                    }}
                  >
                    note: {c.rejectedReason}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 6,
                }}
              >
                <span className={STATUS_CLASS[c.status] ?? "chip"}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
                {c.pointsAwarded > 0 && (
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    +{c.pointsAwarded.toLocaleString()} pts
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
