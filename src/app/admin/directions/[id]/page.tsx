import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { InspirationManager } from "./InspirationManager";
import { FeedConnector } from "./FeedConnector";

export const dynamic = "force-dynamic";

export default async function EditDirection({
  params,
}: {
  params: { id: string };
}) {
  const direction = await prisma.clippingBrief.findUnique({
    where: { id: params.id },
    include: {
      era: { select: { name: true, accentColor: true, slug: true } },
      inspiration: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!direction) notFound();

  return (
    <div>
      <Link
        href="/admin/directions"
        className="eyebrow"
        style={{ display: "inline-block", marginBottom: 12 }}
      >
        ← directions
      </Link>
      <h1 className="admin-title" style={{ marginBottom: 4 }}>
        {direction.title}
      </h1>
      <div
        style={{
          color: direction.era.accentColor,
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        {direction.era.name.toLowerCase()} · {direction.inspiration.length} pins
      </div>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 8 }}>pinterest feed</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
          paste a pinterest board rss url (the board url with <code>.rss</code> on the
          end — e.g. <code>pinterest.com/ebril/dusk-window.rss</code>) or any other feed
          that carries moodboard imagery. we poll it daily and newly pinned images
          appear in the gallery below automatically.
        </p>
        <FeedConnector
          briefId={direction.id}
          initialFeedUrl={direction.inspirationFeedUrl}
          lastSyncedAt={direction.inspirationFeedSyncedAt?.toISOString() ?? null}
        />
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 8 }}>moodboard</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
          drop pinterest pin urls (or any image url) here. fans see them as a horizontal
          gallery on the direction page right above the submission form — shows the look
          you want before they shoot. paste one at a time, or a whole pasted batch (one
          url per line, blank lines skipped).
        </p>
        <InspirationManager
          briefId={direction.id}
          initial={direction.inspiration.map((i) => ({
            id: i.id,
            url: i.url,
            pinUrl: i.pinUrl,
            caption: i.caption,
            attribution: i.attribution,
          }))}
        />
      </section>
    </div>
  );
}
