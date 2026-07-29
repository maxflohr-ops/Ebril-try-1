"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Vibe = "dusk" | "dawn" | "aching" | "open";

interface Choice {
  label: string;
  weights: Partial<Record<Vibe, number>>;
}

interface Question {
  key: string;
  prompt: string;
  choices: Choice[];
}

const QUESTIONS: Question[] = [
  {
    key: "time",
    prompt: "what time is the song happening for you?",
    choices: [
      { label: "just past midnight", weights: { aching: 2, dusk: 1 } },
      { label: "the slow walk home at dusk", weights: { dusk: 2 } },
      { label: "morning light on an unmade bed", weights: { dawn: 2 } },
      { label: "somewhere open, middle of the day", weights: { open: 2, dawn: 1 } },
    ],
  },
  {
    key: "room",
    prompt: "where are you right now?",
    choices: [
      { label: "bedroom, lights off, phone by your face", weights: { aching: 2, dusk: 1 } },
      { label: "window seat, something boiling on the stove", weights: { dusk: 2 } },
      { label: "in the car, nobody else in the passenger seat", weights: { aching: 1, open: 1, dusk: 1 } },
      { label: "outside. grass, concrete, anywhere with sky", weights: { open: 2, dawn: 1 } },
    ],
  },
  {
    key: "holding",
    prompt: "what are you holding on to tonight?",
    choices: [
      { label: "a conversation i couldn't say out loud", weights: { aching: 2 } },
      { label: "the feeling of a place i used to live", weights: { dusk: 2 } },
      { label: "a small good thing i don't want to forget", weights: { dawn: 2, open: 1 } },
      { label: "nothing specific. a soft openness.", weights: { open: 2 } },
    ],
  },
  {
    key: "volume",
    prompt: "how do you want to hear it?",
    choices: [
      { label: "headphones on, as loud as it can be while staying warm", weights: { aching: 1, dusk: 2 } },
      { label: "a little speaker, spilling into another room", weights: { dawn: 1, open: 2 } },
      { label: "almost too quiet to catch the words", weights: { aching: 2, dusk: 1 } },
      { label: "in the car at highway volume", weights: { open: 2 } },
    ],
  },
  {
    key: "after",
    prompt: "after the song ends, what do you want to do?",
    choices: [
      { label: "sit with it in the dark for a minute", weights: { aching: 2, dusk: 1 } },
      { label: "write something down", weights: { aching: 1, dawn: 2 } },
      { label: "text one person", weights: { open: 2 } },
      { label: "press repeat", weights: { dusk: 2, aching: 1 } },
    ],
  },
];

interface Result {
  title: string;
  note: string;
  songTitle: string;
  songUrl: string;
  collectible: string;
  palette: { accent: string; secondary: string };
}

const RESULTS: Record<Vibe, Result> = {
  dusk: {
    title: "you're in the dusk of it.",
    note:
      "the hour after the light goes but before the night commits. you're holding a place in your hands, half-imagined. this one is for you.",
    songTitle: "stranger in you",
    songUrl: "https://ebril.lnk.to/strangerinyou",
    collectible: "dusk window",
    palette: { accent: "#D89B7A", secondary: "#6B4A5E" },
  },
  aching: {
    title: "it's an aching kind of night.",
    note:
      "there's a conversation you didn't have, or the ghost of one. this song is for the tenderest version of you — the one who writes the unsent letter.",
    songTitle: "anticipate heartbreak",
    songUrl: "https://ebril.lnk.to/incopula",
    collectible: "a letter you never sent",
    palette: { accent: "#C97064", secondary: "#2A1A1F" },
  },
  dawn: {
    title: "you're reaching for dawn.",
    note:
      "there's a small good thing you don't want to forget. this song is for the moment before the light gets all the way in — when something is starting to feel possible again.",
    songTitle: "in copula (the whole record)",
    songUrl: "https://ebril.lnk.to/incopula",
    collectible: "an unmade bed",
    palette: { accent: "#D89B7A", secondary: "#8BA888" },
  },
  open: {
    title: "you're open tonight.",
    note:
      "not ready to sit still, not trying to fix anything. this song is for the window-down, no-destination version of you.",
    songTitle: "in copula (full album)",
    songUrl: "https://ebril.lnk.to/incopula",
    collectible: "highway dusk",
    palette: { accent: "#8BA888", secondary: "#D89B7A" },
  },
};

function winnerOf(scores: Record<Vibe, number>): Vibe {
  let top: Vibe = "dusk";
  let best = -1;
  for (const v of Object.keys(scores) as Vibe[]) {
    if (scores[v] > best) {
      best = scores[v];
      top = v;
    }
  }
  return top;
}

export function VibeQuiz() {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<Vibe, number>>({
    dusk: 0,
    dawn: 0,
    aching: 0,
    open: 0,
  });
  const [answered, setAnswered] = useState<number[]>([]);

  function pick(choice: Choice) {
    setScores((prev) => {
      const next = { ...prev };
      for (const [vibe, w] of Object.entries(choice.weights)) {
        next[vibe as Vibe] = (next[vibe as Vibe] ?? 0) + (w ?? 0);
      }
      return next;
    });
    setAnswered((a) => [...a, step]);
    setStep((s) => s + 1);
  }

  function restart() {
    setScores({ dusk: 0, dawn: 0, aching: 0, open: 0 });
    setStep(0);
    setAnswered([]);
  }

  const total = QUESTIONS.length;
  const done = step >= total;

  const result = useMemo(() => (done ? RESULTS[winnerOf(scores)] : null), [done, scores]);

  if (done && result) {
    return (
      <article
        className="surface"
        style={{
          padding: 28,
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(160deg, ${result.palette.accent}2a 0%, ${result.palette.secondary}3d 55%, rgba(21,16,14,0.98) 100%)`,
          borderColor: `${result.palette.accent}44`,
        }}
      >
        <div
          className="eyebrow"
          style={{ color: result.palette.accent }}
        >
          for tonight
        </div>
        <h2
          className="serif"
          style={{
            fontSize: 30,
            fontWeight: 500,
            marginTop: 8,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {result.title}
        </h2>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 15,
            lineHeight: 1.65,
            marginTop: 14,
          }}
        >
          {result.note}
        </p>

        <div
          style={{
            marginTop: 22,
            padding: 18,
            background: "rgba(0,0,0,0.25)",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            press play on
          </div>
          <div
            className="serif"
            style={{
              fontSize: 22,
              fontWeight: 500,
              marginTop: 6,
              lineHeight: 1.2,
            }}
          >
            ♪ {result.songTitle}
          </div>
          <a
            href={result.songUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="btn"
            style={{
              marginTop: 14,
              textDecoration: "none",
              width: "100%",
              justifyContent: "center",
            }}
          >
            listen now ↗
          </a>
        </div>

        <div
          style={{
            marginTop: 28,
            padding: 18,
            background: "rgba(21,16,14,0.45)",
            borderRadius: 14,
            border: "1px solid rgba(216,155,122,0.28)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            keep this
          </div>
          <div
            className="serif"
            style={{
              fontSize: 18,
              fontWeight: 500,
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            come inside and i&rsquo;ll save a cassette of &ldquo;{result.collectible}&rdquo; to
            your shelf. free. takes ten seconds.
          </div>
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link href="/api/auth/patreon" className="btn">
              come inside
            </Link>
            <button onClick={restart} className="btn btn-ghost">
              take it again
            </button>
          </div>
        </div>
      </article>
    );
  }

  const q = QUESTIONS[step];
  const progress = Math.round(((step) / total) * 100);

  return (
    <article className="surface" style={{ padding: 24 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="progress">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {step + 1} of {total}
        </div>
      </div>
      <div
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 500,
          lineHeight: 1.3,
          marginBottom: 18,
          letterSpacing: "-0.01em",
        }}
      >
        {q.prompt}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {q.choices.map((c, i) => (
          <button
            key={`${step}-${i}`}
            type="button"
            onClick={() => pick(c)}
            style={{
              textAlign: "left",
              padding: "14px 16px",
              background: "rgba(21,16,14,0.45)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: 15,
              lineHeight: 1.4,
              cursor: "pointer",
              transition:
                "transform 200ms var(--ease), border-color 200ms var(--ease), background 200ms var(--ease)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(216,155,122,0.45)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {answered.length > 0 && (
        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          <button
            type="button"
            onClick={restart}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            start over
          </button>
        </div>
      )}
    </article>
  );
}
