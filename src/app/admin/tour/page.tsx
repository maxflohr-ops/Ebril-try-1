import { prisma } from "@/lib/db";
import { tokenFor } from "@/lib/tour";
import { TourForm } from "./TourForm";
import { RotateButton } from "./RotateButton";

export const dynamic = "force-dynamic";

export default async function AdminTour() {
  const dates = await prisma.tourDate.findMany({
    orderBy: { startsAt: "asc" },
    include: { _count: { select: { checkins: true } } },
  });
  const baseUrl = process.env.APP_BASE_URL ?? "";

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 20 }}>tour</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
        add a show; the qr url below goes on posters and the merch table. check-in window
        opens 4 hours before and closes 8 hours after showtime.
      </p>
      <TourForm />
      <div style={{ marginTop: 24 }}>
        {dates.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>no shows yet.</p>
        )}
        {dates.map((d) => {
          const token = tokenFor(d.id, d.qrSecret);
          const qrUrl = `${baseUrl.replace(/\/$/, "")}/api/shows/${d.id}/checkin?t=${token}`;
          return (
            <div
              key={d.id}
              className="admin-surface"
              style={{
                padding: 16,
                marginBottom: 12,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {d.city.toLowerCase()} · {d.venue.toLowerCase()}
                </div>
                <div
                  style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}
                >
                  {d.startsAt.toISOString().slice(0, 16).replace("T", " ")} utc · {d._count.checkins}{" "}
                  checked in · +{d.pointsReward} pts per check-in
                </div>
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 10px",
                    background: "#110D0B",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: 12,
                    wordBreak: "break-all",
                    color: "var(--text-muted)",
                  }}
                >
                  {qrUrl}
                </div>
                <div
                  style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 6 }}
                >
                  make a qr code of that url (any free generator) and put it on the merch
                  table / back of the poster.
                </div>
              </div>
              <RotateButton id={d.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
