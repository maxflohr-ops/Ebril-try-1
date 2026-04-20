interface Props {
  tapeColor: string;
  labelColor: string;
  title: string;
  subtitle?: string;
  locked?: boolean;
  rarity?: "common" | "rare" | "vip" | "ephemeral";
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

export function Cassette({
  tapeColor,
  labelColor,
  title,
  subtitle,
  locked,
  rarity = "common",
}: Props) {
  const id = title.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const sheen = `${id}-sheen`;
  const grain = `${id}-grain`;
  const glow = `${id}-glow`;

  const rarityGlow =
    rarity === "vip"
      ? "#D89B7A"
      : rarity === "rare"
        ? "#6B4A5E"
        : rarity === "ephemeral"
          ? "#C97064"
          : null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 10",
        filter: locked ? "grayscale(0.85) brightness(0.6)" : "none",
        opacity: locked ? 0.55 : 1,
        transition: "filter 300ms var(--ease), opacity 300ms var(--ease)",
      }}
    >
      <svg
        viewBox="0 0 320 200"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hexWithAlpha("#ffffff", 0.16)} />
            <stop offset="50%" stopColor={hexWithAlpha("#ffffff", 0)} />
            <stop offset="100%" stopColor={hexWithAlpha("#000000", 0.25)} />
          </linearGradient>
          <filter id={grain}>
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 1 0 0 0 0 0.92 0 0 0 0 0.82 0 0 0 0.22 0" />
          </filter>
          {rarityGlow && (
            <radialGradient id={glow} cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor={hexWithAlpha(rarityGlow, 0.45)} />
              <stop offset="70%" stopColor={hexWithAlpha(rarityGlow, 0)} />
            </radialGradient>
          )}
        </defs>

        {rarityGlow && <rect width="320" height="200" fill={`url(#${glow})`} />}

        {/* cassette body */}
        <rect x="10" y="18" width="300" height="164" rx="14" fill={tapeColor} />
        <rect x="10" y="18" width="300" height="164" rx="14" fill={`url(#${sheen})`} />
        <rect
          x="10"
          y="18"
          width="300"
          height="164"
          rx="14"
          filter={`url(#${grain})`}
          style={{ mixBlendMode: "overlay" as const }}
        />

        {/* label paper */}
        <rect
          x="26"
          y="36"
          width="268"
          height="80"
          rx="6"
          fill={labelColor}
          opacity="0.92"
        />
        <line
          x1="30"
          y1="60"
          x2="290"
          y2="60"
          stroke={hexWithAlpha("#000000", 0.18)}
          strokeWidth="0.6"
        />

        {/* reels */}
        <g transform="translate(92 150)">
          <circle r="22" fill="#15100E" opacity="0.75" />
          <circle r="14" fill={hexWithAlpha(tapeColor, 0.7)} />
          <circle r="6" fill="#15100E" />
          {[...Array(6)].map((_, i) => (
            <rect
              key={i}
              x="-1.2"
              y="-13"
              width="2.4"
              height="6"
              fill="#15100E"
              transform={`rotate(${(360 / 6) * i})`}
            />
          ))}
        </g>
        <g transform="translate(228 150)">
          <circle r="22" fill="#15100E" opacity="0.75" />
          <circle r="14" fill={hexWithAlpha(tapeColor, 0.7)} />
          <circle r="6" fill="#15100E" />
          {[...Array(6)].map((_, i) => (
            <rect
              key={i}
              x="-1.2"
              y="-13"
              width="2.4"
              height="6"
              fill="#15100E"
              transform={`rotate(${(360 / 6) * i})`}
            />
          ))}
        </g>

        {/* reel connector line */}
        <line
          x1="114"
          y1="150"
          x2="206"
          y2="150"
          stroke="#15100E"
          strokeWidth="1"
          opacity="0.4"
        />

        {/* tape window */}
        <rect
          x="130"
          y="130"
          width="60"
          height="14"
          rx="3"
          fill="#0A0807"
          opacity="0.55"
        />

        {/* title + subtitle on label */}
        <text
          x="160"
          y="74"
          textAnchor="middle"
          fill="#15100E"
          fontSize="18"
          fontFamily="Fraunces, Cormorant Garamond, Georgia, serif"
          fontWeight="500"
          letterSpacing="-0.3"
        >
          {title.toLowerCase()}
        </text>
        {subtitle && (
          <text
            x="160"
            y="94"
            textAnchor="middle"
            fill="#15100E"
            fontSize="10"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="500"
            opacity="0.6"
            letterSpacing="1.2"
          >
            {subtitle.toUpperCase()}
          </text>
        )}

        {/* side A/B marks */}
        <text
          x="24"
          y="30"
          fill={hexWithAlpha(labelColor, 0.75)}
          fontSize="9"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="600"
          letterSpacing="1.4"
        >
          SIDE A
        </text>
        <text
          x="296"
          y="30"
          textAnchor="end"
          fill={hexWithAlpha(labelColor, 0.75)}
          fontSize="9"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="600"
          letterSpacing="1.4"
        >
          EBRIL
        </text>
      </svg>
    </div>
  );
}
