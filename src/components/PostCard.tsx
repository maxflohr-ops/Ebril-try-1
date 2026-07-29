"use client";

import { useState } from "react";

interface Props {
  id: string;
  body: string;
  imageUrl: string | null;
  audioUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  moodTag: string | null;
  publishedAt: string;
  pinned: boolean;
  likeCount: number;
  liked: boolean;
  signedIn?: boolean;
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getUTCFullYear() === today.getUTCFullYear() &&
    d.getUTCMonth() === today.getUTCMonth() &&
    d.getUTCDate() === today.getUTCDate();
  if (sameDay) return "today";
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function PostCard(props: Props) {
  const [liked, setLiked] = useState(props.liked);
  const [count, setCount] = useState(props.likeCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (props.signedIn === false) {
      // Anonymous visitor — send them to the OAuth start page so they can
      // come back and hold it for real. No optimistic flip.
      window.location.href = "/api/auth/patreon";
      return;
    }
    // optimistic
    setLiked((v) => !v);
    setCount((n) => n + (liked ? -1 : 1));
    setBusy(true);
    const res = await fetch(`/api/posts/${props.id}/like`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      // revert on failure
      setLiked((v) => !v);
      setCount((n) => n + (liked ? 1 : -1));
      return;
    }
    const body = await res.json();
    setLiked(body.liked);
    setCount(body.count);
  }

  const paragraphs = props.body.split(/\n{2,}/);

  return (
    <article
      className="surface"
      style={{
        padding: 22,
        marginBottom: 14,
        borderColor: props.pinned ? "rgba(216,155,122,0.35)" : undefined,
        background: props.pinned
          ? "linear-gradient(160deg, rgba(216,155,122,0.12) 0%, rgba(30,24,21,0.95) 60%)"
          : undefined,
      }}
    >
      <header
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 14,
          color: "var(--text-muted)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: "var(--accent)" }}>ebril</span>
        <span>·</span>
        <span>{formatDate(props.publishedAt)}</span>
        {props.moodTag && (
          <>
            <span>·</span>
            <span>{props.moodTag}</span>
          </>
        )}
        {props.pinned && (
          <span
            style={{
              marginLeft: "auto",
              color: "var(--accent)",
              letterSpacing: "0.12em",
            }}
          >
            pinned
          </span>
        )}
      </header>
      {props.imageUrl && (
        <div
          style={{
            borderRadius: 14,
            overflow: "hidden",
            marginBottom: 14,
            position: "relative",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.imageUrl}
            alt=""
            style={{ width: "100%", display: "block", filter: "saturate(0.9)" }}
          />
        </div>
      )}
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="serif"
          style={{
            margin: i === 0 ? 0 : "12px 0 0",
            fontSize: 18,
            lineHeight: 1.6,
            color: "var(--text)",
            letterSpacing: "-0.005em",
            whiteSpace: "pre-wrap",
          }}
        >
          {p}
        </p>
      ))}
      {props.audioUrl && (
        <audio
          controls
          src={props.audioUrl}
          style={{
            marginTop: 14,
            width: "100%",
            accentColor: "var(--accent)",
          }}
        />
      )}
      {props.linkUrl && (
        <a
          href={props.linkUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="btn btn-ghost"
          style={{
            marginTop: 14,
            textDecoration: "none",
            display: "inline-flex",
          }}
        >
          {props.linkLabel ?? "open"} ↗
        </a>
      )}
      <footer
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          onClick={toggle}
          disabled={busy}
          aria-pressed={liked}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: liked ? "var(--accent)" : "var(--text-muted)",
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "color 200ms var(--ease), border-color 200ms var(--ease)",
            borderColor: liked ? "rgba(216,155,122,0.5)" : "var(--border)",
          }}
        >
          <span aria-hidden style={{ fontSize: 14 }}>
            {liked ? "♥" : "♡"}
          </span>
          <span>{count}</span>
        </button>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
          {props.signedIn === false
            ? "come inside to hold it"
            : liked
              ? "held close"
              : "tap the heart if it lands"}
        </span>
      </footer>
    </article>
  );
}
