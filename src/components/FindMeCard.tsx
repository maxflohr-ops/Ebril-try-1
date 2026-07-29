import type { LinkKind } from "@prisma/client";

interface LinkRow {
  id: string;
  kind: LinkKind;
  label: string;
  url: string;
}

// Minimal, hand-feeling SVG glyphs — stroke-based, warm, never branded-busy.
// They gesture at each platform without mimicking its logo.
const GLYPHS: Partial<Record<LinkKind, (props: { className?: string }) => JSX.Element>> = {
  spotify_artist: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M7 9.5c3-1 7-1 10 .6" />
      <path d="M7.5 12.5c2.5-.8 5.8-.6 8.3.8" />
      <path d="M8 15.5c2-.6 4.5-.4 6.5.6" />
    </svg>
  ),
  spotify_featured: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M7 9.5c3-1 7-1 10 .6" />
      <path d="M7.5 12.5c2.5-.8 5.8-.6 8.3.8" />
      <path d="M8 15.5c2-.6 4.5-.4 6.5.6" />
    </svg>
  ),
  youtube_channel: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="19" height="12" rx="3" />
      <path d="M10.5 9.4v5.2l4.5-2.6z" fill="currentColor" stroke="none" />
    </svg>
  ),
  youtube_featured: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="19" height="12" rx="3" />
      <path d="M10.5 9.4v5.2l4.5-2.6z" fill="currentColor" stroke="none" />
    </svg>
  ),
  apple_music: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17.2V7.5l9-2.2v9.5" />
      <circle cx="7.2" cy="17.6" r="2.2" />
      <circle cx="16.2" cy="14.8" r="2.2" />
    </svg>
  ),
  shopify_store: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  bandcamp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l4-10h14l-4 10z" />
    </svg>
  ),
  soundcloud: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M4 14v3M7 12v6M10 10v8M13 8v10M16 10v7a2 2 0 0 0 2 2h2a3 3 0 0 0 0-6 3 3 0 0 0-2-.8" />
    </svg>
  ),
  instagram: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="0.8" fill="currentColor" />
    </svg>
  ),
  tiktok: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 4c.4 2.6 2.4 4.4 5 4.5" />
    </svg>
  ),
  discord: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7c2-1 8-1 10 0l2 10c-2 1.3-4 2-6 2l-1-2" />
      <path d="M8 19c-2 0-4-.7-6-2l2-10" />
      <circle cx="9" cy="13" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  website: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17" />
      <path d="M12 3c3 3.6 3 14.4 0 18" />
      <path d="M12 3c-3 3.6-3 14.4 0 18" />
    </svg>
  ),
};

function Glyph({ kind }: { kind: LinkKind }) {
  const G = GLYPHS[kind] ?? GLYPHS.website!;
  return (
    <span
      aria-hidden
      style={{
        width: 18,
        height: 18,
        display: "inline-flex",
        color: "var(--accent)",
      }}
    >
      <G />
    </span>
  );
}

export function FindMeCard({ links }: { links: LinkRow[] }) {
  if (links.length === 0) return null;
  return (
    <section
      className="surface"
      style={{
        padding: 24,
        background:
          "radial-gradient(120% 160% at 0% 0%, rgba(216,155,122,0.12) 0%, transparent 50%), linear-gradient(160deg, rgba(107,74,94,0.35) 0%, rgba(30,24,21,0.95) 70%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="eyebrow" style={{ color: "var(--accent)" }}>find me</div>
      <div
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 500,
          marginTop: 6,
          lineHeight: 1.2,
        }}
      >
        a few other places i live.
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        {links.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noreferrer noopener"
            className="find-me-pill"
          >
            <Glyph kind={l.kind} />
            <span>{l.label.toLowerCase()}</span>
            <span className="find-me-arrow" aria-hidden>↗</span>
          </a>
        ))}
      </div>
      <style>{`
        .find-me-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(21, 16, 14, 0.55);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          color: var(--text);
          font-size: 14px;
          font-weight: 500;
          transition: transform 200ms var(--ease), border-color 200ms var(--ease), background 200ms var(--ease);
          backdrop-filter: blur(6px);
        }
        .find-me-pill:hover {
          transform: translateY(-1px);
          border-color: rgba(216,155,122,0.4);
          background: rgba(30, 24, 21, 0.7);
        }
        .find-me-arrow {
          margin-left: auto;
          color: var(--text-muted);
          font-size: 13px;
        }
      `}</style>
    </section>
  );
}
