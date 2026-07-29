interface Image {
  id: string;
  url: string;
  pinUrl: string | null;
  caption: string | null;
  attribution: string | null;
}

export function Moodboard({ images }: { images: Image[] }) {
  if (images.length === 0) return null;
  return (
    <section style={{ marginBottom: 28 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        look & feel
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 14 }}>
        a few pins to set the mood before you film. these aren&rsquo;t rules — they&rsquo;re
        the direction.
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          padding: "4px 2px 12px",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "thin",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {images.map((img) => {
          const linkOut = img.pinUrl ?? img.url;
          return (
            <a
              key={img.id}
              href={linkOut}
              target="_blank"
              rel="noreferrer noopener"
              style={{
                flex: "0 0 auto",
                width: 180,
                scrollSnapAlign: "start",
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.05)",
                background: "var(--bg-card)",
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "4/5",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.caption ?? ""}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "saturate(0.92)",
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(21,16,14,0) 60%, rgba(21,16,14,0.6) 100%)",
                  }}
                />
              </div>
              {(img.caption || img.attribution) && (
                <div
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    lineHeight: 1.4,
                    minHeight: 38,
                  }}
                >
                  {img.caption ? (
                    <div style={{ color: "var(--text)" }}>{img.caption}</div>
                  ) : null}
                  {img.attribution && (
                    <div
                      style={{
                        marginTop: img.caption ? 4 : 0,
                        fontSize: 11,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {img.attribution}
                    </div>
                  )}
                </div>
              )}
            </a>
          );
        })}
      </div>
    </section>
  );
}
