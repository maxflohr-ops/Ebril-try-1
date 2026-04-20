import Link from "next/link";
import { fetchShopifyProducts, isShopifyConfigured } from "@/lib/shopify";
import { getShopifyStore } from "@/lib/externalLinks";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function ShopPage() {
  const [products, store] = await Promise.all([
    fetchShopifyProducts(24),
    getShopifyStore(),
  ]);

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px 80px" }}>
      <div className="eyebrow">merch</div>
      <h2 style={{ marginTop: 6 }}>things i made to hold onto</h2>
      <p
        style={{
          color: "var(--text-muted)",
          maxWidth: 460,
          marginTop: 10,
          fontSize: 15,
        }}
      >
        the full store opens in a new tab. i&rsquo;ll be expanding the pieces you can earn
        with points over time.
      </p>

      {!isShopifyConfigured() && (
        <div
          className="surface"
          style={{ padding: 20, marginTop: 24, textAlign: "center" }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            the shop&rsquo;s setting up. {store ? (
              <a href={store.url} target="_blank" rel="noreferrer noopener" style={{ color: "var(--accent)" }}>
                visit it directly →
              </a>
            ) : (
              <Link href="/" style={{ color: "var(--accent)" }}>
                back home →
              </Link>
            )}
          </div>
        </div>
      )}

      {isShopifyConfigured() && products.length === 0 && (
        <div
          className="surface"
          style={{ padding: 20, marginTop: 24, textAlign: "center" }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            nothing live right now. i&rsquo;ll drop things here soon.
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 18,
          }}
        >
          {products.map((p) => (
            <a
              key={p.id}
              href={p.onlineStoreUrl ?? store?.url ?? "#"}
              target="_blank"
              rel="noreferrer noopener"
              className="surface"
              style={{
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                textDecoration: "none",
                color: "inherit",
                transition: "transform 200ms var(--ease), border-color 200ms var(--ease)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  background:
                    "linear-gradient(135deg, rgba(107,74,94,0.4), rgba(216,155,122,0.1))",
                  overflow: "hidden",
                }}
              >
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "saturate(0.92)",
                    }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(21,16,14,0) 60%, rgba(21,16,14,0.55) 100%)",
                    mixBlendMode: "multiply",
                  }}
                />
              </div>
              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  flex: 1,
                }}
              >
                <div
                  className="serif"
                  style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.2 }}
                >
                  {p.title.toLowerCase()}
                </div>
                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 14,
                  }}
                >
                  {p.priceCents !== null ? (
                    <span>${(p.priceCents / 100).toFixed(2)}</span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>sold out</span>
                  )}
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 13,
                    }}
                  >
                    open ↗
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
