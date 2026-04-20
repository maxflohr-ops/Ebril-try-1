"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  displayName: string | null;
  ritual: {
    id: string;
    title: string;
    body: string;
    pointsReward: number;
    claimed: boolean;
  } | null;
  direction: {
    id: string;
    title: string;
    eraName: string;
    accent: string;
    pointsViral: number;
  } | null;
  voiceNote: {
    id: string;
    title: string;
    caption: string;
  } | null;
}

const MOODS = [
  { key: "dusk", label: "dusk" },
  { key: "dawn", label: "dawn" },
  { key: "threeam", label: "3am" },
  { key: "aching", label: "aching" },
  { key: "open", label: "open" },
  { key: "alone", label: "alone" },
  { key: "together", label: "together" },
  { key: "commute", label: "commute" },
] as const;

const TOTAL_STEPS = 3;

export function WelcomeFlow(props: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<string | null>(null);
  const [entry, setEntry] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryMessage, setEntryMessage] = useState<string | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  async function submitFirstEntry() {
    if (!mood || !entry.trim()) {
      setEntryError("pick a feeling and a sentence — either one is enough.");
      return;
    }
    setSavingEntry(true);
    setEntryError(null);
    const res = await fetch("/api/diary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: entry.trim(),
        mood,
        sharedWithEbril: false,
      }),
    });
    setSavingEntry(false);
    if (!res.ok) {
      setEntryError("didn't land. you can skip this and write later.");
      return;
    }
    setEntryMessage("kept. +10 points.");
    setTimeout(() => setStep((s) => s + 1), 600);
  }

  async function finishAndGo(path: string) {
    if (finishing) return;
    setFinishing(true);
    await fetch("/api/onboarding/finish", { method: "POST" });
    router.push(path);
    router.refresh();
  }

  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  return (
    <div style={{ position: "relative" }}>
      <header style={{ textAlign: "center", marginBottom: 24 }}>
        <div className="eyebrow" style={{ color: "var(--accent)" }}>
          copula · come inside
        </div>
        <div className="progress" style={{ marginTop: 14, maxWidth: 260, marginInline: "auto" }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {step === 0 && (
        <article
          className="surface"
          style={{
            padding: 32,
            textAlign: "center",
            background:
              "linear-gradient(160deg, rgba(216,155,122,0.2) 0%, rgba(107,74,94,0.35) 50%, rgba(21,16,14,0.98) 100%)",
            borderColor: "rgba(216,155,122,0.35)",
          }}
        >
          <h1 style={{ fontSize: 40, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
            {props.displayName ? `hi, ${props.displayName}.` : "hi."}
          </h1>
          <p
            className="serif"
            style={{
              fontSize: 19,
              lineHeight: 1.6,
              fontStyle: "italic",
              color: "var(--text)",
              marginTop: 18,
              letterSpacing: "-0.005em",
            }}
          >
            this is a small room for the people who live inside the songs. i wanted you to
            see it before anything asks you for anything.
          </p>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              lineHeight: 1.6,
              marginTop: 16,
              maxWidth: 420,
              marginInline: "auto",
            }}
          >
            three small things to set up. skip any of them — nothing here is a hurdle.
          </p>
          <div
            style={{ marginTop: 26, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}
          >
            <button className="btn" onClick={() => setStep(1)}>
              keep going →
            </button>
            <button
              type="button"
              onClick={() => finishAndGo("/")}
              className="btn btn-ghost"
              disabled={finishing}
            >
              skip, show me the room
            </button>
          </div>
        </article>
      )}

      {step === 1 && (
        <article className="surface" style={{ padding: 24 }}>
          <div className="eyebrow">first page</div>
          <h2 style={{ marginTop: 8, fontSize: 26 }}>
            what do the songs feel like tonight?
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
            pick a mood, write a sentence. this is the dusk diary — it saves here, private
            unless you mark it shared. 10 points once a day.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
            {MOODS.map((m) => {
              const active = mood === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMood(m.key)}
                  className="chip"
                  style={{
                    cursor: "pointer",
                    background: active
                      ? "rgba(216,155,122,0.2)"
                      : "rgba(107,74,94,0.15)",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    borderColor: active ? "rgba(216,155,122,0.5)" : "var(--border)",
                    transition: "all 200ms var(--ease)",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <textarea
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            rows={4}
            placeholder="a line is enough. what did one of the songs do to you?"
            style={{
              marginTop: 18,
              width: "100%",
              background: "transparent",
              color: "var(--text)",
              border: "none",
              borderBottom: "1px solid var(--border)",
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: 18,
              lineHeight: 1.55,
              padding: "10px 0",
              outline: "none",
              resize: "vertical",
              letterSpacing: "-0.005em",
            }}
          />

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn"
              onClick={submitFirstEntry}
              disabled={savingEntry}
            >
              {savingEntry ? "…" : "keep this page"}
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn btn-ghost"
            >
              skip, write later
            </button>
            {entryMessage && (
              <span style={{ color: "var(--success)", fontSize: 13 }}>{entryMessage}</span>
            )}
            {entryError && (
              <span style={{ color: "var(--danger)", fontSize: 13 }}>{entryError}</span>
            )}
          </div>
        </article>
      )}

      {step === 2 && (
        <article className="surface" style={{ padding: 24 }}>
          <div className="eyebrow">what&rsquo;s in the room</div>
          <h2 style={{ marginTop: 8, fontSize: 26 }}>
            three things to know about.
          </h2>

          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            {props.ritual ? (
              <Row
                accent="var(--accent)"
                title="tonight's ritual"
                body={`${props.ritual.title.toLowerCase()} · press play when i ask, +${props.ritual.pointsReward} pts`}
                href={`/`}
                cta="i'll see it on home →"
              />
            ) : (
              <Row
                accent="var(--accent)"
                title="listening rituals"
                body="every so often i set a moment — press play on a song, claim it, a small warmth lands in your balance."
                href="/"
                cta="i'll see them on home →"
              />
            )}

            {props.direction ? (
              <Row
                accent={props.direction.accent}
                title="make something for the room"
                body={`${props.direction.title.toLowerCase()} · ${props.direction.eraName.toLowerCase()} era · up to ${props.direction.pointsViral.toLocaleString()} pts`}
                href={`/clip/${props.direction.id}`}
                cta="see the direction →"
              />
            ) : (
              <Row
                accent="var(--accent)"
                title="make clips, carry the songs"
                body="directions inside each era tell you what to make. the good ones land on the wall."
                href="/eras"
                cta="see the eras →"
              />
            )}

            {props.voiceNote ? (
              <Row
                accent="var(--accent-2)"
                title="voice notes from me"
                body={`"${props.voiceNote.title.toLowerCase()}" — short audio only inside.`}
                href="/notes"
                cta="listen →"
              />
            ) : (
              <Row
                accent="var(--accent-2)"
                title="voice notes from me"
                body="half-minute audio drops. some tier-gated, some open."
                href="/notes"
                cta="listen when there's one →"
              />
            )}
          </div>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn"
              disabled={finishing}
              onClick={() => finishAndGo("/")}
            >
              {finishing ? "…" : "take me in"}
            </button>
            <Link
              href="/vibe"
              className="btn btn-ghost"
              onClick={() => {
                fetch("/api/onboarding/finish", { method: "POST" });
              }}
            >
              take the vibe test first
            </Link>
          </div>
        </article>
      )}
    </div>
  );
}

function Row({
  accent,
  title,
  body,
  href,
  cta,
}: {
  accent: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        padding: 16,
        borderRadius: 14,
        border: `1px solid ${accent}33`,
        background: `linear-gradient(160deg, ${accent}16 0%, rgba(30,24,21,0.9) 80%)`,
        transition: "transform 200ms var(--ease), border-color 200ms var(--ease)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: accent,
        }}
      >
        {title}
      </div>
      <div
        className="serif"
        style={{ fontSize: 18, marginTop: 6, lineHeight: 1.35, fontWeight: 500 }}
      >
        {body}
      </div>
      <div
        style={{
          marginTop: 10,
          color: "var(--text-muted)",
          fontSize: 12,
          letterSpacing: "0.08em",
        }}
      >
        {cta}
      </div>
    </Link>
  );
}
