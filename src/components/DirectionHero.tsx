import Link from "next/link";

interface Props {
  briefId: string;
  eraName: string;
  eraSlug: string;
  accentColor: string;
  secondaryColor: string;
  title: string;
  direction: string;
  coverUrl: string | null;
  songTitle: string | null;
  pointsViral: number;
  hashtagHint: string | null;
  platformHint: string | null;
  hasSound: boolean;
  liveClipCount: number;
}

export function DirectionHero(props: Props) {
  const firstLine = props.direction.split("\n")[0];
  return (
    <Link
      href={`/clip/${props.briefId}`}
      className="surface"
      style={{
        position: "relative",
        display: "block",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        background: `linear-gradient(160deg, ${props.accentColor}3a 0%, ${props.secondaryColor}46 45%, rgba(21,16,14,0.97) 100%)`,
        borderColor: `${props.accentColor}44`,
        padding: 28,
      }}
    >
      {props.coverUrl && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${props.coverUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.22,
            filter: "saturate(0.92) blur(1px)",
          }}
        />
      )}
      <div style={{ position: "relative" }}>
        <div
          className="eyebrow"
          style={{ color: props.accentColor, display: "flex", gap: 8, alignItems: "center" }}
        >
          <span>{props.eraName.toLowerCase()}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>direction open</span>
        </div>
        <div
          className="serif"
          style={{
            fontSize: 34,
            fontWeight: 500,
            marginTop: 10,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {props.title.toLowerCase()}
        </div>
        {props.songTitle && (
          <div
            style={{
              fontSize: 13,
              color: props.accentColor,
              marginTop: 6,
            }}
          >
            ♪ {props.songTitle.toLowerCase()}
          </div>
        )}
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 14,
            lineHeight: 1.6,
            marginTop: 14,
            maxWidth: 520,
          }}
        >
          {firstLine}
        </p>
        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(21,16,14,0.55)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 13,
              fontWeight: 600,
              color: props.accentColor,
            }}
          >
            up to {props.pointsViral.toLocaleString()} pts
          </span>
          {props.hasSound && (
            <span
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(21,16,14,0.55)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 13,
              }}
            >
              ♪ sound ready
            </span>
          )}
          {props.hashtagHint && (
            <span
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(21,16,14,0.55)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              #{props.hashtagHint.replace(/^#/, "")}
            </span>
          )}
          {props.liveClipCount > 0 && (
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: 13,
                marginLeft: "auto",
              }}
            >
              {props.liveClipCount} on the wall
            </span>
          )}
        </div>
        <div
          style={{
            marginTop: 18,
            color: "var(--text-muted)",
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          make one →
        </div>
      </div>
    </Link>
  );
}
