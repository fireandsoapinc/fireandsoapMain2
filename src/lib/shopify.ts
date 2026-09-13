export type ShopifyProduct = {
  id: string;
  /** Numeric Shopify product ID used by third-party integrations. */
  shopifyProductId: string;
  handle: string;
  variantId: string;
  name: string;
  category: string;
  /** Formatted sale / current price, e.g. "USD 24.00". */
  price: string;
  /** Numeric amount for cart math (sale price). */
  priceAmount: number;
  /**
   * Formatted compare-at (original) price when higher than `price`.
   * Empty string when there is no real sale.
   */
  compareAtPrice: string;
  size: string;
  /** Formatted net weight from the Shopify variant, e.g. "4 oz" — empty if unavailable. */
  netWeight: string;
  description: string;
  descriptionHtml: string;
  image: string;
  images: string[];
  tag: string;
  collections: string[];
};

export function hasSalePrice(product: Pick<ShopifyProduct, "compareAtPrice">): boolean {
  return Boolean(product.compareAtPrice);
}

function formatMoney(amount: number | string, currencyCode: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "$0.00";
  return `${currencyCode} ${value.toFixed(2)}`;
}

export type ShopCategory = {
  label: string;
  /** Shopify collection handle, or null for "All". */
  slug: string | null;
};

export const ALL_SHOP_CATEGORY: ShopCategory = { label: "All", slug: null };

/** @deprecated Prefer fetchShopifyCollections(); kept for gradual migration. */
export const SHOP_CATEGORIES: ShopCategory[] = [
  ALL_SHOP_CATEGORY,
  { label: "Fall Collection", slug: "fall-collection" },
  { label: "Candles", slug: "candles" },
  { label: "Soaps", slug: "soaps" },
];

export type ShopCategoryLabel = string;

export function shopCategoryFromSlug(slug: string, categories: ShopCategory[] = SHOP_CATEGORIES): string {
  const match = categories.find((category) => category.slug === slug);
  return match?.label ?? "All";
}

export function shopCategoryToSlug(label: string, categories: ShopCategory[] = SHOP_CATEGORIES): string | null {
  const match = categories.find((category) => category.label === label);
  return match?.slug ?? null;
}

function slugifyHandle(handle: string | null | undefined, title: string): string {
  if (handle?.trim()) return handle.trim().toLowerCase();
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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

function formatNetWeight(weight: number | null | undefined, unit: string | null | undefined): string {
  if (weight == null || !Number.isFinite(weight) || weight <= 0) return "";

  const rounded =
    weight >= 100 ? String(Math.round(weight)) : String(Number(weight.toFixed(2))).replace(/\.?0+$/, "");

  switch ((unit ?? "").toUpperCase()) {
    case "OUNCES":
      return `${rounded} oz`;
    case "POUNDS":
      return `${rounded} lb`;
    case "GRAMS":
      return `${rounded} g`;
    case "KILOGRAMS":
      return `${rounded} kg`;
    default:
      return unit ? `${rounded} ${unit.toLowerCase()}` : rounded;
  }
}

async function shopifyGraphQL(query: string, variables: Record<string, unknown>): Promise<any> {
  if (!shopDomain) {
    throw new Error("Missing VITE_SHOPIFY_STORE_DOMAIN environment variable.");
  }
  if (!storefrontToken) {
    throw new Error("Missing VITE_SHOPIFY_STOREFRONT_TOKEN environment variable.");
  }

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
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

  return json;
}

/**
 * Shop filter tabs from Shopify collections (plus "All").
 * Ordered newest-first via ID desc — Storefront API has no CREATED_AT for collections;
 * Shopify IDs increase over time, so this approximates recently created.
 */
export async function fetchShopifyCollections(first = 50): Promise<ShopCategory[]> {
  const query = `
    query GetCollections($first: Int!) {
      collections(first: $first, sortKey: ID, reverse: true) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }
  `;

  const json = await shopifyGraphQL(query, { first });
  const edges = json.data?.collections?.edges ?? [];

  const fromShopify: ShopCategory[] = edges
    .map((edge: { node: { title?: string; handle?: string } }) => {
      const title = edge.node?.title?.trim() ?? "";
      if (!title) return null;
      return {
        label: title,
        slug: slugifyHandle(edge.node.handle, title),
      } satisfies ShopCategory;
    })
    .filter(Boolean) as ShopCategory[];

  return [ALL_SHOP_CATEGORY, ...fromShopify];
}

export async function fetchShopifyProducts(first = 12): Promise<ShopifyProduct[]> {
  const query = `
    query GetProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            description
            descriptionHtml
            productType
            tags
            collections(first: 10) {
              edges {
                node {
                  title
                }
              }
            }
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
                  id
                  title
                  weight
                  weightUnit
                  priceV2 {
                    amount
                    currencyCode
                  }
                  compareAtPriceV2 {
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

  const json = await shopifyGraphQL(query, { first });

  return json.data.products.edges.map((edge: any) => {
    const node = edge.node;
    const image = node.images.edges[0]?.node.url ?? "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=720&fit=crop&auto=format";
    const variant = node.variants.edges[0]?.node;
    const rawPrice = variant?.priceV2;
    const priceAmount = rawPrice ? Number(rawPrice.amount) : 0;
    const currencyCode = rawPrice?.currencyCode ?? "USD";
    const price = rawPrice ? formatMoney(priceAmount, currencyCode) : "$0.00";

    const rawCompare = variant?.compareAtPriceV2;
    const compareAmount = rawCompare ? Number(rawCompare.amount) : NaN;
    const compareAtPrice =
      Number.isFinite(compareAmount) && compareAmount > priceAmount
        ? formatMoney(compareAmount, rawCompare.currencyCode ?? currencyCode)
        : "";

    const variantTitle = variant?.title ?? "";
    const size = variantTitle && variantTitle !== "Default Title" ? variantTitle : "Standard";
    const netWeight = formatNetWeight(variant?.weight, variant?.weightUnit);

    const images = node.images.edges.map((imgEdge: any) => imgEdge.node.url).filter(Boolean);
    const collections = node.collections?.edges?.map((edge: any) => edge.node.title as string).filter(Boolean) ?? [];

    return {
      id: node.id,
      shopifyProductId: String(node.id).split("/").pop() ?? "",
      handle: node.handle ?? "",
      variantId: variant?.id ?? "",
      name: node.title,
      category: normalizeCategory(node.productType, node.tags),
      price,
      priceAmount: Number.isFinite(priceAmount) ? priceAmount : 0,
      compareAtPrice,
      size,
      netWeight,
      description: node.description ?? "",
      descriptionHtml: node.descriptionHtml ?? "",
      image,
      images: images.length > 0 ? images : [image],
      tag: normalizeTag(node.tags),
      collections,
    };
  });
}

/**
 * Newsletter / marketing list via Storefront customerCreate.
 * Kept for compatibility with the live Join flow until a dedicated ESP or Admin marketing path is adopted.
 */
export async function subscribeEmailToMarketing(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const password = `Shopify-${Math.random().toString(36).slice(2, 12)}!A`;

  const createMutation = `
    mutation CustomerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const createVariables = {
    input: {
      email: normalizedEmail,
      password,
      acceptsMarketing: true,
    },
  };

  const createResult = await shopifyGraphQL(createMutation, createVariables);
  const customerCreate = createResult.data?.customerCreate;
  const createErrors = customerCreate?.userErrors || [];

  const emailAlreadyExists = createErrors.some((error: any) =>
    typeof error.message === "string" &&
    ["already exists", "already taken", "duplicate", "taken"].some((phrase) =>
      error.message.toLowerCase().includes(phrase),
    ),
  );

  if (customerCreate?.customer?.id && createErrors.length === 0) {
    return;
  }

  if (emailAlreadyExists) {
    return;
  }

  if (createErrors.length > 0) {
    const errorMessage = createErrors.map((error: any) => error.message).join(" | ");
    throw new Error(`Failed to create customer: ${errorMessage}`);
  }

  throw new Error("Unable to subscribe email to the marketing list.");
}

export type CheckoutLine = {
  variantId: string;
  quantity: number;
};

export async function createShopifyCheckoutUrl(lines: CheckoutLine[]): Promise<string> {
  const validLines = lines.filter((line) => line.variantId && line.quantity > 0);
  if (validLines.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const mutation = `
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const json = await shopifyGraphQL(mutation, {
    input: {
      lines: validLines.map((line) => ({
        merchandiseId: line.variantId,
        quantity: line.quantity,
      })),
    },
  });

  const userErrors = json.data?.cartCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error: { message: string }) => error.message).join(" | "));
  }

  const checkoutUrl = json.data?.cartCreate?.cart?.checkoutUrl;
  if (!checkoutUrl) {
    throw new Error("Unable to start Shopify checkout.");
  }

  return checkoutUrl;
}

/** Shopify Storefront `CustomerUserError` from customer account mutations. */
export type CustomerUserError = {
  code?: string | null;
  field?: string[] | null;
  message: string;
};

export type CustomerAccessToken = {
  accessToken: string;
  expiresAt: string;
};

export type CustomerActivateByUrlPayload = {
  customer: {
    id: string;
    email: string | null;
  } | null;
  customerAccessToken: CustomerAccessToken | null;
  customerUserErrors: CustomerUserError[];
};

export type CustomerActivateByUrlSuccess = {
  ok: true;
  customer: NonNullable<CustomerActivateByUrlPayload["customer"]>;
  customerAccessToken: CustomerAccessToken | null;
};

export type CustomerActivateByUrlFailure = {
  ok: false;
  errors: CustomerUserError[];
};

export type CustomerActivateByUrlResult = CustomerActivateByUrlSuccess | CustomerActivateByUrlFailure;

/**
 * Safely decode a Shopify account `activationUrl` query value.
 * URLSearchParams already decodes once; a second pass handles double-encoding.
 */
export function decodeActivationUrlParam(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let value = raw.trim();
  if (!value) return null;

  for (let i = 0; i < 2; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(value)) break;
    try {
      value = decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * Activate a Shopify customer account via the emailed activation URL.
 * Storefront API: `customerActivateByUrl(activationUrl, password)`.
 */
export async function activateCustomerByUrl(
  activationUrl: string,
  password: string,
): Promise<CustomerActivateByUrlResult> {
  const trimmedPassword = password.trim();
  if (!activationUrl) {
    return {
      ok: false,
      errors: [{ message: "Missing activation link. Please use the link from your email.", field: null, code: null }],
    };
  }
  if (!trimmedPassword) {
    return {
      ok: false,
      errors: [{ message: "Please enter a password.", field: ["password"], code: null }],
    };
  }

  const mutation = `
    mutation CustomerActivateByUrl($activationUrl: URL!, $password: String!) {
      customerActivateByUrl(activationUrl: $activationUrl, password: $password) {
        customer {
          id
          email
        }
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `;

  const json = await shopifyGraphQL(mutation, {
    activationUrl,
    password: trimmedPassword,
  });

  const payload = json.data?.customerActivateByUrl as CustomerActivateByUrlPayload | undefined;
  if (!payload) {
    return {
      ok: false,
      errors: [{ message: "Unexpected response from Shopify. Please try again.", field: null, code: null }],
    };
  }

  const errors = payload.customerUserErrors ?? [];
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (!payload.customer?.id) {
    return {
      ok: false,
      errors: [{ message: "Unable to activate account. The link may have expired.", field: null, code: null }],
    };
  }

  return {
    ok: true,
    customer: payload.customer,
    customerAccessToken: payload.customerAccessToken,
  };
}
