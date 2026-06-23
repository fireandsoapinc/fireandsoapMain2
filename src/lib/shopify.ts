export type ShopifyProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  size: string;
  description: string;
  image: string;
  images: string[];
  tag: string;
};

const shopDomain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const storefrontToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;

const GRAPHQL_URL = `https://${shopDomain}/api/2024-10/graphql.json`;

function normalizeTag(tags: string[]): string {
  const lower = tags.map((tag) => tag.toLowerCase());
  if (lower.includes("new")) return "NEW";
  if (lower.includes("bestseller") || lower.includes("best seller")) return "BESTSELLER";
  return "";
}

function normalizeCategory(productType: string | null, tags: string[]): string {
  if (productType) return productType;
  const lowerTags = tags.map((tag) => tag.toLowerCase());
  if (lowerTags.includes("candle")) return "Candle";
  if (lowerTags.includes("soap")) return "Soap";
  return tags[0] ?? "Product";
}

export async function fetchShopifyProducts(first = 12): Promise<ShopifyProduct[]> {
  if (!shopDomain) {
    throw new Error("Missing VITE_SHOPIFY_STORE_DOMAIN environment variable.");
  }
  if (!storefrontToken) {
    throw new Error("Missing VITE_SHOPIFY_STOREFRONT_TOKEN environment variable.");
  }

  const query = `
    query GetProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            description
            productType
            tags
            images(first: 2) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  title
                  priceV2 {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken,
    },
    body: JSON.stringify({ query, variables: { first } }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify request failed: ${response.status} ${response.statusText} ${errorText}`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    const errors = json.errors.map((error: any) => error.message).join(" | ");
    throw new Error(`Shopify GraphQL errors: ${errors}`);
  }

  return json.data.products.edges.map((edge: any) => {
    const node = edge.node;
    const image = node.images.edges[0]?.node.url ?? "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=720&fit=crop&auto=format";
    const variant = node.variants.edges[0]?.node;
    const rawPrice = variant?.priceV2;
    const price = rawPrice
      ? `${rawPrice.currencyCode} ${Number(rawPrice.amount).toFixed(2)}`
      : "$0.00";
    const variantTitle = variant?.title ?? "";
    const size = variantTitle && variantTitle !== "Default Title" ? variantTitle : "Standard";

    const images = node.images.edges.map((imgEdge: any) => imgEdge.node.url).filter(Boolean);
    return {
      id: node.id,
      name: node.title,
      category: normalizeCategory(node.productType, node.tags),
      price,
      size,
      description: node.description ?? "",
      image,
      images: images.length > 0 ? images : [image],
      tag: normalizeTag(node.tags),
    };
  });
}
