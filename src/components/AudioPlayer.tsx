"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  noteId: string;
  audioUrl: string;
  durationSec: number;
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function randomHeights(count: number, seed: string): number[] {
  // Deterministic pseudo-random heights so a given note renders the same
  // "waveform" across sessions without an expensive audio decode.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const base = (h % 1000) / 1000;
    // bias toward a gentle middle range so bars don't look jagged
    out.push(0.35 + base * 0.55);
  }
  return out;
}

export function AudioPlayer({ noteId, audioUrl, durationSec }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSec);
  const [completedReported, setCompletedReported] = useState(false);
  const lastReportedRef = useRef(0);

  const bars = useMemo(() => randomHeights(64, noteId), [noteId]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onLoaded = () => setDuration(el.duration || durationSec);
    const onEnded = () => {
      setPlaying(false);
      report(el.currentTime, true);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  // Throttled progress reporting: every 15s of playtime + on completion.
  useEffect(() => {
    if (current - lastReportedRef.current >= 15) {
      lastReportedRef.current = current;
      report(current, false);
    }
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  async function report(seconds: number, completed: boolean) {
    try {
      await fetch(`/api/notes/${noteId}/listen`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secondsListened: Math.floor(seconds),
          completed,
        }),
      });
      if (completed) setCompletedReported(true);
    } catch {
      // Offline or transient — no-op. The next tick will retry at the
      // 15-second mark.
    }
  }

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
      report(el.currentTime, false);
    }
  }

  function seekToPct(pct: number) {
    const el = audioRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(duration, duration * pct));
    el.currentTime = next;
    setCurrent(next);
  }

  const progressPct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      className="surface"
      style={{
        padding: 22,
        background:
          "linear-gradient(160deg, rgba(107,74,94,0.35) 0%, rgba(30,24,21,0.97) 70%)",
      }}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          seekToPct((e.clientX - rect.left) / rect.width);
        }}
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          height: 64,
          cursor: "pointer",
          padding: "8px 0",
        }}
        aria-label="seek"
      >
        {bars.map((h, i) => {
          const active = (i / bars.length) * 100 <= progressPct;
          return (
            <span
              key={i}
              style={{
                flex: 1,
                height: `${Math.round(h * 100)}%`,
                background: active ? "var(--accent)" : "rgba(244,236,226,0.22)",
                borderRadius: 999,
                transition: "background 160ms var(--ease)",
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <button
          className="btn"
          onClick={toggle}
          aria-label={playing ? "pause" : "play"}
          style={{ padding: "12px 20px" }}
        >
          {playing ? "pause" : "play"}
        </button>
        <div
          className="serif"
          style={{
            fontSize: 15,
            color: "var(--text-muted)",
            letterSpacing: "-0.005em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatTime(current)}{" "}
          <span style={{ opacity: 0.5 }}>/ {formatTime(duration)}</span>
        </div>
        {completedReported && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--success)",
            }}
          >
            listened
          </span>
        )}
      </div>
    </div>
  );
}
