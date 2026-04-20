import { VibeQuiz } from "./VibeQuiz";

export const metadata = {
  title: "copula — vibe test",
  description:
    "a small room in the dusk. five questions to find the song that meets you tonight.",
};

export default function VibePage() {
  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "48px 20px 96px",
        position: "relative",
      }}
    >
      <div className="hero-wash" style={{ height: 420 }} />
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div className="eyebrow" style={{ color: "var(--accent)" }}>
          copula · vibe test
        </div>
        <h1 style={{ margin: "8px 0 14px", fontSize: 36, letterSpacing: "-0.02em" }}>
          which one is for you tonight?
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 15,
            lineHeight: 1.6,
            maxWidth: 420,
            marginInline: "auto",
          }}
        >
          five quiet questions. no account, no email, no cookies tracking you around the
          internet. at the end i&rsquo;ll pick one of mine for you.
        </p>
      </div>
      <VibeQuiz />
    </main>
  );
}
