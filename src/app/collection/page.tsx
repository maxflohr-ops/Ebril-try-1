import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserShelf } from "@/lib/collectibles";
import { Cassette } from "@/components/Cassette";

export const dynamic = "force-dynamic";

const RARITY_LABEL: Record<string, string> = {
  common: "common",
  rare: "rare",
  vip: "vip",
  ephemeral: "one night only",
};

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function shortDate(d: Date) {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export default async function CollectionPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");

  const shelf = await getUserShelf(session.userId);
  const earned = shelf.filter((c) => c.granted);
  const locked = shelf.filter((c) => !c.granted);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 80px" }}>
      <div className="eyebrow">collection</div>
      <h2 style={{ marginTop: 6 }}>the cassettes you&rsquo;ve earned</h2>
      <p
        style={{
          color: "var(--text-muted)",
          maxWidth: 480,
          marginTop: 10,
          fontSize: 15,
        }}
      >
        every cassette is a moment — your first sign-in, your first ritual, a full month of
        dusk pages. they live here. nothing is for sale.
      </p>

      <div
        style={{
          marginTop: 10,
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        {earned.length} of {shelf.length}
      </div>

      {earned.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>earned</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {earned.map((c) => (
              <article
                key={c.id}
                className="surface"
                style={{ padding: 16 }}
              >
                <Cassette
                  tapeColor={c.tapeColor}
                  labelColor={c.labelColor}
                  title={c.name}
                  subtitle={RARITY_LABEL[c.rarity] ?? c.rarity}
                  rarity={c.rarity as "common" | "rare" | "vip" | "ephemeral"}
                />
                <div
                  className="serif"
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    marginTop: 14,
                    lineHeight: 1.3,
                  }}
                >
                  {c.name}
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  {c.flavor}
                </div>
                {c.grantedAt && (
                  <div
                    style={{
                      marginTop: 10,
                      color: "var(--text-muted)",
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    kept since {shortDate(c.grantedAt)}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>still to find</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {locked.map((c) => (
              <article
                key={c.id}
                className="surface"
                style={{ padding: 16 }}
              >
                <Cassette
                  tapeColor={c.tapeColor}
                  labelColor={c.labelColor}
                  title={c.name}
                  subtitle={RARITY_LABEL[c.rarity] ?? c.rarity}
                  rarity={c.rarity as "common" | "rare" | "vip" | "ephemeral"}
                  locked
                />
                <div
                  className="serif"
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    marginTop: 14,
                    lineHeight: 1.3,
                    color: "var(--text-muted)",
                  }}
                >
                  {c.name}
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    marginTop: 6,
                    lineHeight: 1.5,
                    opacity: 0.8,
                  }}
                >
                  {c.flavor}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
