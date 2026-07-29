import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ClipForm } from "./ClipForm";
import { CopyField } from "@/components/CopyField";
import { Moodboard } from "@/components/Moodboard";

export const dynamic = "force-dynamic";

export default async function BriefPage({
  params,
}: {
  params: { briefId: string };
}) {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const direction = await prisma.clippingBrief.findUnique({
    where: { id: params.briefId },
    include: {
      era: true,
      song: { select: { title: true, slug: true } },
      inspiration: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!direction || !direction.active || !direction.era.active) notFound();

  const mine = await prisma.clip.findMany({
    where: { userId: session.userId, briefId: direction.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 96px" }}>
      <Link
        href={`/eras/${direction.era.slug}`}
        className="eyebrow"
        style={{ display: "inline-block", marginBottom: 20 }}
      >
        ← {direction.era.name.toLowerCase()}
      </Link>

      <header
        style={{
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          padding: 32,
          background: `linear-gradient(160deg, ${direction.era.accentColor}2e 0%, ${direction.era.secondaryColor}3a 50%, rgba(21,16,14,0.98) 100%)`,
          border: `1px solid ${direction.era.accentColor}33`,
          marginBottom: 28,
        }}
      >
        {direction.coverUrl && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${direction.coverUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.22,
            }}
          />
        )}
        <div style={{ position: "relative" }}>
          <div
            className="eyebrow"
            style={{ color: direction.era.accentColor }}
          >
            direction · {direction.era.name.toLowerCase()}
          </div>
          <h1 style={{ marginTop: 10, fontSize: 38, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            {direction.title.toLowerCase()}
          </h1>
          {direction.song && (
            <Link
              href={`/songs/${direction.song.slug}`}
              style={{
                marginTop: 12,
                display: "inline-block",
                fontSize: 13,
                color: direction.era.accentColor,
                textDecoration: "none",
              }}
            >
              ♪ {direction.song.title.toLowerCase()} →
            </Link>
          )}
        </div>
      </header>

      <section style={{ marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>the direction</div>
        <p
          className="serif"
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            letterSpacing: "-0.005em",
          }}
        >
          {direction.direction}
        </p>
        {(direction.platformHint || direction.hashtagHint) && (
          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {direction.platformHint && (
              <span className="chip">on {direction.platformHint.toLowerCase()}</span>
            )}
            {direction.hashtagHint && (
              <span className="chip">#{direction.hashtagHint.replace(/^#/, "")}</span>
            )}
          </div>
        )}
      </section>

      <Moodboard
        images={direction.inspiration.map((i) => ({
          id: i.id,
          url: i.url,
          pinUrl: i.pinUrl,
          caption: i.caption,
          attribution: i.attribution,
        }))}
      />

      {(direction.tiktokSoundUrl || direction.captionTemplate) && (
        <section style={{ marginBottom: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>the tools</div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 14 }}>
            everything you need to post in under a minute.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {direction.tiktokSoundUrl && (
              <a
                href={direction.tiktokSoundUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="btn"
                style={{ textDecoration: "none", width: "100%" }}
              >
                ♪ use this sound on tiktok ↗
              </a>
            )}
            {direction.captionTemplate && (
              <CopyField
                label="caption to paste"
                value={direction.captionTemplate}
                multiline
              />
            )}
          </div>
        </section>
      )}

      <section
        className="surface"
        style={{ padding: 20, marginBottom: 28 }}
      >
        <div className="eyebrow" style={{ marginBottom: 12 }}>what it&rsquo;s worth</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {[
            { label: "kept", pts: direction.pointsApproved, note: "i saw it and approved it." },
            { label: "held", pts: direction.pointsFeatured, note: "up on the wall inside." },
            {
              label: "carried",
              pts: direction.pointsViral,
              note: direction.viralThreshold
                ? `past ${direction.viralThreshold.toLocaleString()} views.`
                : "out into the world.",
            },
          ].map((row) => (
            <div key={row.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                {row.label}
              </div>
              <div
                className="serif"
                style={{
                  fontSize: 26,
                  fontWeight: 500,
                  color: "var(--accent)",
                  marginTop: 6,
                }}
              >
                +{row.pts.toLocaleString()}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                {row.note}
              </div>
            </div>
          ))}
        </div>
      </section>

      {direction.exampleUrl && (
        <section style={{ marginBottom: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>reference</div>
          <a
            href={direction.exampleUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-ghost"
            style={{ textDecoration: "none" }}
          >
            watch the example ↗
          </a>
        </section>
      )}

      <section>
        <div className="eyebrow" style={{ marginBottom: 12 }}>take it home</div>
        <ClipForm briefId={direction.id} />
      </section>

      {mine.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>your takes so far</div>
          {mine.map((c) => (
            <div
              key={c.id}
              className="surface"
              style={{
                padding: 14,
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer noopener"
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  wordBreak: "break-all",
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                }}
              >
                {c.url}
              </a>
              <span
                className={
                  c.status === "rejected"
                    ? "chip chip-danger"
                    : c.status === "featured" || c.status === "viral"
                      ? "chip chip-success"
                      : "chip"
                }
              >
                {c.status === "pending"
                  ? "with me"
                  : c.status === "approved"
                    ? "kept"
                    : c.status === "featured"
                      ? "held"
                      : c.status === "viral"
                        ? "carried"
                        : "returned"}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
