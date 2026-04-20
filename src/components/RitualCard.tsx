"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Ritual {
  id: string;
  title: string;
  body: string;
  trackTitle: string | null;
  trackUrl: string | null;
  artworkUrl: string | null;
  endsAt: string;
  pointsReward: number;
  claimed: boolean;
  reflection: string | null;
}

export function RitualCard({ ritual }: { ritual: Ritual }) {
  const router = useRouter();
  const [reflection, setReflection] = useState(ritual.reflection ?? "");
  const [claimed, setClaimed] = useState(ritual.claimed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awarded, setAwarded] = useState(0);

  async function claim() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/rituals/${ritual.id}/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reflection: reflection.trim() || null }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "didn't land.");
      return;
    }
    const body = await res.json();
    setClaimed(true);
    if (body.credited) setAwarded(body.pointsAwarded);
    router.refresh();
  }

  const closesInMs = new Date(ritual.endsAt).getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.round(closesInMs / 3_600_000));
  const closesCopy =
    hoursLeft < 24
      ? `closes in ${hoursLeft}h`
      : `until ${new Date(ritual.endsAt).toISOString().slice(0, 10)}`;

  return (
    <div
      className="surface"
      style={{
        padding: 0,
        overflow: "hidden",
        position: "relative",
        background:
          "linear-gradient(160deg, rgba(107,74,94,0.4) 0%, rgba(30,24,21,0.98) 70%)",
      }}
    >
      {ritual.artworkUrl && (
        <div
          style={{
            position: "relative",
            height: 180,
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ritual.artworkUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "saturate(0.9)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(21,16,14,0.2) 0%, rgba(21,16,14,0.9) 100%)",
            }}
          />
        </div>
      )}
      <div style={{ padding: 22 }}>
        <div className="eyebrow" style={{ color: "var(--accent)" }}>
          tonight&rsquo;s ritual · {closesCopy}
        </div>
        <div
          className="serif"
          style={{
            fontSize: 24,
            fontWeight: 500,
            marginTop: 8,
            lineHeight: 1.2,
          }}
        >
          {ritual.title}
        </div>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 14,
            marginTop: 10,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {ritual.body}
        </p>
        {ritual.trackTitle && (
          <div style={{ marginTop: 14 }}>
            {ritual.trackUrl ? (
              <a
                href={ritual.trackUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-ghost"
                style={{ textDecoration: "none" }}
              >
                ♪ press play on {ritual.trackTitle.toLowerCase()}
              </a>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                ♪ {ritual.trackTitle}
              </div>
            )}
          </div>
        )}
        {!claimed ? (
          <div style={{ marginTop: 18 }}>
            <textarea
              placeholder="what it made you feel. optional. stays with you."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                background: "transparent",
                color: "var(--text)",
                border: "none",
                borderBottom: "1px solid var(--border)",
                fontFamily: "var(--font-fraunces), Georgia, serif",
                fontSize: 15,
                lineHeight: 1.5,
                resize: "vertical",
                padding: "8px 0",
                outline: "none",
              }}
            />
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <button
                className="btn"
                onClick={claim}
                disabled={busy}
              >
                {busy ? "…" : "i heard it"}
              </button>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                +{ritual.pointsReward} points
              </span>
              {error && (
                <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--success)" }}>
            heard. {awarded > 0 ? `+${awarded} points.` : "thank you for being with me tonight."}
          </div>
        )}
      </div>
    </div>
  );
}
