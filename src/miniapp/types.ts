export type ElementId = "fire" | "water" | "earth" | "air";

export type SanctuaryId = "rain-cedar" | "crackling-hearth" | "ocean-waves";

export type RitualStep = 1 | 2 | 3 | 4;

export type MatchedProduct = {
  /** Exact display name — never altered from the given ritual copy. */
  name: string;
  /** Resolved Shopify product (image, id, variant) if a catalog match was found. */
  product: import("@/lib/shopify").ShopifyProduct | null;
};

export type ProductPair = {
  candle: MatchedProduct;
  soap: MatchedProduct;
  aura: {
    title: string;
    body: string;
    code: string;
    ink: string;
    inkMuted: string;
    ctaBg: string;
    ctaInk: string;
  };
};

export type RitualDraft = {
  step: RitualStep;
  element: ElementId | null;
  /** Hertz frequency from the tuner (approx). */
  hz: number;
  /** 0–1 warmth vs botanical blend — drives gradient. */
  warmth: number;
  botanical: number;
  sanctuary: SanctuaryId | null;
  revealed: boolean;
  productPair: ProductPair | null;
};

export const INITIAL_DRAFT: RitualDraft = {
  step: 1,
  element: null,
  hz: 136.1,
  warmth: 0.55,
  botanical: 0.45,
  sanctuary: null,
  revealed: false,
  productPair: null,
};
