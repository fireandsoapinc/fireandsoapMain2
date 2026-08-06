/** Hosted New Customer Accounts portal (Shopify). */
export const SHOPIFY_CUSTOMER_ACCOUNT_URL = "https://shopify.com/79154643143/account";

/** Anchor props so cart/checkout state on this tab is preserved. */
export const customerAccountLinkProps = {
  href: SHOPIFY_CUSTOMER_ACCOUNT_URL,
  target: "_blank",
  rel: "noreferrer",
} as const;
