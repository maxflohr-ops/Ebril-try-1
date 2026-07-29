import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function dayLabel(d: Date) {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function yearLabel(d: Date) {
  return d.getUTCFullYear().toString();
}

const ERR_COPY: Record<string, string> = {
  bad_token: "that qr didn't match. is it a current poster?",
  too_early: "check-in opens four hours before showtime. see you there.",
  too_late: "check-in closed. hope it was a good night.",
  not_found: "that show isn't in the system.",
  error: "something didn't land. try again in a minute.",
};

export default async function ShowsPage({
  searchParams,
}: {
  searchParams: { state?: string; err?: string; pts?: string; show?: string };
}) {
  const session = await getSession();

  const now = new Date();
  const [upcoming, past, myCheckins] = await Promise.all([
    prisma.tourDate.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.tourDate.findMany({
      where: { startsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: 12,
    }),
    session.userId
      ? prisma.tourCheckin.findMany({
          where: { userId: session.userId },
          select: { tourDateId: true },
        })
      : Promise.resolve([] as { tourDateId: string }[]),
  ]);

  const checkedIn = new Set(myCheckins.map((c) => c.tourDateId));

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
      <div className="eyebrow">shows</div>
      <h2 style={{ marginTop: 6 }}>where i&rsquo;m playing.</h2>
      <p
        style={{
          color: "var(--text-muted)",
          maxWidth: 440,
          marginTop: 10,
          fontSize: 15,
        }}
      >
        if you come, find the qr on the merch table or the back of the poster. scan it and
        i&rsquo;ll know you were there.
      </p>

      {searchParams.state === "checked_in" && (
        <div
          className="surface"
          style={{
            padding: 16,
            marginTop: 20,
            borderColor: "rgba(139,168,136,0.3)",
          }}
        >
          <div className="eyebrow" style={{ color: "var(--success)" }}>
            thank you for being there
          </div>
          <div style={{ marginTop: 6, fontSize: 14 }}>
            checked in. {searchParams.pts ? `+${searchParams.pts} points.` : "kept you with us."}
          </div>
        </div>
      )}
      {searchParams.state === "already" && (
        <div className="surface" style={{ padding: 16, marginTop: 20 }}>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
            already checked in for this one. thank you for being here.
          </div>
        </div>
      )}
      {searchParams.err && (
        <div
          className="surface"
          style={{
            padding: 16,
            marginTop: 20,
            borderColor: "rgba(201,112,100,0.3)",
          }}
        >
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
            {ERR_COPY[searchParams.err] ?? ERR_COPY.error}
          </div>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div
          className="surface"
          style={{ padding: 24, marginTop: 28, textAlign: "center" }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            no dates on the books right now. i&rsquo;ll post them here first.
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>upcoming</div>
          {upcoming.map((d) => (
            <ShowRow
              key={d.id}
              d={d}
              checkedIn={checkedIn.has(d.id)}
              upcoming
            />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>past</div>
          {past.map((d) => (
            <ShowRow
              key={d.id}
              d={d}
              checkedIn={checkedIn.has(d.id)}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function ShowRow({
  d,
  checkedIn,
  upcoming,
}: {
  d: {
    id: string;
    city: string;
    venue: string;
    country: string;
    startsAt: Date;
    doorsAt: Date | null;
    ticketUrl: string | null;
    noteFromEbril: string | null;
  };
  checkedIn: boolean;
  upcoming?: boolean;
}) {
  return (
    <article
      className="surface"
      style={{
        padding: 18,
        marginBottom: 12,
        display: "grid",
        gridTemplateColumns: "80px 1fr auto",
        gap: 16,
        alignItems: "center",
        opacity: upcoming ? 1 : 0.72,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          className="serif"
          style={{ fontSize: 26, fontWeight: 500, color: "var(--accent)", lineHeight: 1 }}
        >
          {dayLabel(d.startsAt)}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
          {yearLabel(d.startsAt)}
        </div>
      </div>
      <div>
        <div
          className="serif"
          style={{ fontSize: 19, fontWeight: 500, lineHeight: 1.2 }}
        >
          {d.city.toLowerCase()} · {d.venue.toLowerCase()}
        </div>
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: 12,
            marginTop: 6,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {d.country}
          {d.doorsAt ? ` · doors ${d.doorsAt.toISOString().slice(11, 16)} utc` : ""}
        </div>
        {d.noteFromEbril && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: 13,
              marginTop: 8,
              lineHeight: 1.55,
              fontStyle: "italic",
            }}
          >
            {d.noteFromEbril}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        {checkedIn && <span className="chip chip-success">kept</span>}
        {upcoming && d.ticketUrl && (
          <a
            href={d.ticketUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-ghost"
            style={{ textDecoration: "none" }}
          >
            tickets ↗
          </a>
        )}
      </div>
    </article>
  );
}
