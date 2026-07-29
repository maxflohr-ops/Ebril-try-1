"use client";

import { useEffect, useState } from "react";

interface Props {
  tierName: string | null;
  nextTierName: string | null;
  progressPct: number;
  monthlyCents: number;
  nextThresholdCents: number | null;
  userKey?: string;
}

const FLOWER_POSITIONS = [
  { left: "18%", r: -16 },
  { left: "50%", r: 8 },
  { left: "78%", r: 22 },
];

function Flower({
  style,
  delay,
}: {
  style: React.CSSProperties;
  delay: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="flower"
      style={{ ...style, animationDelay: `${delay}ms` }}
      aria-hidden
    >
      <g fill="currentColor" fillOpacity="0.85">
        <ellipse cx="12" cy="6" rx="2.4" ry="3.6" />
        <ellipse
          cx="12"
          cy="6"
          rx="2.4"
          ry="3.6"
          transform="rotate(72 12 12)"
        />
        <ellipse
          cx="12"
          cy="6"
          rx="2.4"
          ry="3.6"
          transform="rotate(144 12 12)"
        />
        <ellipse
          cx="12"
          cy="6"
          rx="2.4"
          ry="3.6"
          transform="rotate(216 12 12)"
        />
        <ellipse
          cx="12"
          cy="6"
          rx="2.4"
          ry="3.6"
          transform="rotate(288 12 12)"
        />
      </g>
      <circle cx="12" cy="12" r="1.6" fill="#15100E" />
    </svg>
  );
}

export function TierCard({
  tierName,
  nextTierName,
  progressPct,
  monthlyCents,
  nextThresholdCents,
  userKey = "anon",
}: Props) {
  const [celebrating, setCelebrating] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const toNextCents = nextThresholdCents
    ? Math.max(0, nextThresholdCents - monthlyCents)
    : 0;
  const lowered = tierName ? tierName.toLowerCase() : "unranked";
  const storageKey = `ebril:tier:${userKey}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = window.localStorage.getItem(storageKey);
    if (prev !== null && prev !== (tierName ?? "")) {
      // Only celebrate upgrades — if the new name is missing, treat as downgrade and skip.
      if (tierName) {
        setCelebrating(true);
        setReplayKey((k) => k + 1);
        const t = setTimeout(() => setCelebrating(false), 1800);
        window.localStorage.setItem(storageKey, tierName);
        return () => clearTimeout(t);
      }
    }
    if (tierName) window.localStorage.setItem(storageKey, tierName);
  }, [tierName, storageKey]);

  function replay() {
    setCelebrating(false);
    // defer so CSS picks the remount
    requestAnimationFrame(() => {
      setCelebrating(true);
      setReplayKey((k) => k + 1);
      setTimeout(() => setCelebrating(false), 1800);
    });
  }

  return (
    <div
      onClick={replay}
      className="surface"
      style={{
        padding: 24,
        background:
          "linear-gradient(160deg, rgba(107,74,94,0.55) 0%, rgba(30,24,21,0.95) 100%)",
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
      }}
      title="tap to replay"
    >
      {celebrating && (
        <>
          <div key={`sweep-${replayKey}`} className="dawn-sweep" aria-hidden />
          {FLOWER_POSITIONS.map((f, i) => (
            <Flower
              key={`flower-${replayKey}-${i}`}
              style={
                {
                  left: f.left,
                  "--r": `${f.r}deg`,
                } as React.CSSProperties
              }
              delay={120 + i * 90}
            />
          ))}
        </>
      )}

      <div className="eyebrow" style={{ position: "relative" }}>your tier</div>
      <div
        className="serif"
        style={{
          fontSize: 34,
          fontWeight: 500,
          marginTop: 8,
          lineHeight: 1.1,
          position: "relative",
        }}
      >
        {celebrating ? (
          <span
            key={`letters-${replayKey}`}
            className="tier-letters"
            aria-label={lowered}
          >
            {[...lowered].map((ch, i) => (
              <span
                key={i}
                style={{ "--i": i } as React.CSSProperties}
              >
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
            <span key={`check-${replayKey}`} className="tier-check" aria-hidden>
              ✓
            </span>
          </span>
        ) : (
          <span>{lowered}</span>
        )}
      </div>
      {nextTierName ? (
        <div style={{ marginTop: 20, position: "relative" }}>
          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--text-muted)" }}>
            ${(toNextCents / 100).toFixed(2)} a month from{" "}
            <span style={{ color: "var(--text)" }}>{nextTierName.toLowerCase()}</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: 16,
            fontSize: 13,
            color: "var(--text-muted)",
            position: "relative",
          }}
        >
          you&rsquo;re as close as it gets. thank you, truly.
        </div>
      )}
    </div>
  );
}
