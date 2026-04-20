import Link from "next/link";

// Anonymous-visitor upsell that appears at the bottom of public pages.
// Kept intentionally small so it never overshadows the moment a fan is
// already having — it's a gentle hand on the shoulder, not a wall.
export function ComeInsideRail({
  line,
}: {
  line?: string;
}) {
  return (
    <section
      className="surface"
      style={{
        marginTop: 48,
        padding: 24,
        textAlign: "center",
        background:
          "linear-gradient(160deg, rgba(216,155,122,0.14) 0%, rgba(107,74,94,0.22) 55%, rgba(30,24,21,0.95) 100%)",
        borderColor: "rgba(216,155,122,0.28)",
      }}
    >
      <div className="eyebrow" style={{ color: "var(--accent)" }}>
        copula
      </div>
      <div
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 500,
          marginTop: 8,
          lineHeight: 1.25,
          maxWidth: 460,
          marginInline: "auto",
        }}
      >
        {line ??
          "come inside. keep the moments that land, make something that carries the song, write your own page."}
      </div>
      <div style={{ marginTop: 16 }}>
        <Link href="/api/auth/patreon" className="btn">
          come inside
        </Link>
      </div>
      <div
        style={{
          marginTop: 10,
          color: "var(--text-muted)",
          fontSize: 12,
          letterSpacing: "0.08em",
        }}
      >
        free · sign in with patreon
      </div>
    </section>
  );
}
