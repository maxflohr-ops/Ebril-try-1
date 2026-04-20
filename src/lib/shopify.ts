const API_VERSION = "2024-10";

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  imageUrl: string | null;
  onlineStoreUrl: string | null;
  priceCents: number | null;
  currency: string;
}

function endpoint(): string | null {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) return null;
  return `https://${domain}/api/${API_VERSION}/graphql.json`;
}

export function isShopifyConfigured(): boolean {
  return !!process.env.SHOPIFY_STORE_DOMAIN && !!process.env.SHOPIFY_STOREFRONT_TOKEN;
}

export async function fetchShopifyProducts(limit = 20): Promise<ShopifyProduct[]> {
  const url = endpoint();
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!url || !token) return [];

  const query = `#graphql
    query Products($first: Int!) {
      products(first: $first, sortKey: BEST_SELLING) {
        edges {
          node {
            id
            title
            handle
            onlineStoreUrl
            featuredImage { url }
            priceRange {
              minVariantPrice { amount currencyCode }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-storefront-access-token": token,
    },
    body: JSON.stringify({ query, variables: { first: limit } }),
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    console.error("[shopify] fetch failed", res.status, await res.text());
    return [];
  }
  const json = await res.json();
  const edges = json?.data?.products?.edges ?? [];
  return edges.map((e: { node: Record<string, unknown> }) => {
    const n = e.node as {
      id: string;
      title: string;
      handle: string;
      onlineStoreUrl: string | null;
      featuredImage: { url: string } | null;
      priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    };
    const amt = Number(n.priceRange?.minVariantPrice?.amount ?? 0);
    return {
      id: n.id,
      title: n.title,
      handle: n.handle,
      imageUrl: n.featuredImage?.url ?? null,
      onlineStoreUrl: n.onlineStoreUrl ?? null,
      priceCents: isFinite(amt) ? Math.round(amt * 100) : null,
      currency: n.priceRange?.minVariantPrice?.currencyCode ?? "USD",
    };
  });
}
