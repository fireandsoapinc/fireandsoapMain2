import type { ShopifyProduct } from "@/lib/shopify";
import { getFrequencyBand, type FrequencyBandId } from "./frequencies";
import type { ElementId, MatchedProduct, ProductPair, SanctuaryId } from "../types";

export type AuraCardContent = ProductPair["aura"];

const RITUAL_CODE = "MYAURA10";

type RitualProductRef = {
  /** Stable Shopify product handle — preferred match key. */
  handle: string;
  /** Display name shown on the aura card / tiles. */
  name: string;
};

/** Candle chosen by zodiac sign group (the element selected in Step 1). */
const CANDLE_BY_ELEMENT: Record<ElementId, RitualProductRef> = {
  fire: { handle: "sanctum-noir-candle", name: "Sanctum Noir Candle" },
  water: { handle: "sanctum-frosted-candle", name: "Sanctum Frosted Candle" },
  air: { handle: "sanctum-marbleized-mini-candles", name: "Sanctum Marbleized Mini Candles" },
  earth: { handle: "golden-sanctum", name: "Golden Sanctum" },
};

/** Soap chosen by sanctuary (selected in Step 3). Handles must match Shopify. */
const SOAP_BY_SANCTUARY: Record<SanctuaryId, RitualProductRef> = {
  "rain-cedar": { handle: "white-soap-rose-xl", name: "White Soap Rose Cosmetic Cleansing Bar Soap" },
  "ocean-waves": { handle: "mini-seashell-soaps", name: "Mini Seashell Cosmetic Cleansing Bar Soap" },
  "crackling-hearth": {
    handle: "signature-butterfly-soap",
    name: "Signature Butterfly Cosmetic Cleansing Bar Soap",
  },
};

type AuraCopy = { title: string; body: string };

/** Aura title + body depend on sanctuary (Step 3) and frequency band (Step 2). */
const AURA_BY_SANCTUARY_BAND: Record<SanctuaryId, Record<FrequencyBandId, AuraCopy>> = {
  "rain-cedar": {
    low: {
      title: "Rooted Aura",
      body: "You are anchored in the material world and seek beauty in its highest form. Your ritual is one of sensory immersion with the natural world around us.",
    },
    mid: {
      title: "Canopy Reset Aura",
      body: "Your nervous system needs a shelter from constant noise. Your ritual is filtered light and quiet mist: slowing your thoughts until your mind softens like moss after rain.",
    },
    high: {
      title: "Petrichor Release Aura",
      body: "You are carrying static that no longer belongs to you. Your ritual is a heavy downpour: washing the slate clean and making room for fresh growth to begin.",
    },
  },
  "crackling-hearth": {
    low: {
      title: "Hearth Anchor Aura",
      body: "You require a steady, unwavering center when the world moves too fast. Your ritual is heavy timber and deep embers: pulling your energy back into your body and keeping you firmly rooted.",
    },
    mid: {
      title: "Radiant Solace Aura",
      body: "You carry tension silently in your body. Your ritual is gentle, ambient heat: melting away tight shoulders and softening sharp thoughts into a warm, steady flicker.",
    },
    high: {
      title: "Ember Aura",
      body: "You burn bright and move fast. Your ritual has a warmth that sharpens intention and burns away hesitation.",
    },
  },
  "ocean-waves": {
    low: {
      title: "Mineral Tide Aura",
      body: "You feel with the tide, immersing yourself in both the highs and lows. Your ritual is immersion: mineral calm, soft steam, and emotional weather made gentle.",
    },
    mid: {
      title: "Clear Horizon Aura",
      body: "Your mind moves like the weather—curious, quick, and seeking clearer skies. Your ritual is breath and space: salt air, open water, and quiet, drifting thoughts.",
    },
    high: {
      title: "High Tide Aura",
      body: "You have been holding back a wave of unspoken feeling. Your ritual is total surrender: letting the surge wash over you, clearing away what hurts and leaving you weightless.",
    },
  },
};

/** Ink/CTA palette per sanctuary, matching the ambient tones used in Step 3. */
const AURA_THEME_BY_SANCTUARY: Record<SanctuaryId, Omit<AuraCardContent, "title" | "body" | "code">> = {
  "rain-cedar": {
    ink: "#c8d9c6",
    inkMuted: "rgba(200, 217, 198, 0.65)",
    ctaBg: "#c8d9c6",
    ctaInk: "#101a12",
  },
  "crackling-hearth": {
    ink: "#e8c6a4",
    inkMuted: "rgba(232, 198, 164, 0.65)",
    ctaBg: "#e8c6a4",
    ctaInk: "#1f130a",
  },
  "ocean-waves": {
    ink: "#b7d4de",
    inkMuted: "rgba(183, 212, 222, 0.65)",
    ctaBg: "#b7d4de",
    ctaInk: "#0b1a20",
  },
};

function normalizeProductTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/cleaning/g, "cleansing")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findProduct(catalog: ShopifyProduct[], ref: RitualProductRef): ShopifyProduct | null {
  const handle = ref.handle.trim().toLowerCase();
  if (handle) {
    const byHandle = catalog.find((p) => p.handle.trim().toLowerCase() === handle);
    if (byHandle) return byHandle;
  }

  const target = normalizeProductTitle(ref.name);
  if (!target) return null;

  const exact = catalog.find((p) => normalizeProductTitle(p.name) === target);
  if (exact) return exact;

  const partial = catalog.find((p) => {
    const title = normalizeProductTitle(p.name);
    return title.includes(target) || target.includes(title);
  });
  if (partial) return partial;

  // Token match: all meaningful words from the map name appear in the Shopify title.
  const tokens = target
    .split(" ")
    .filter((t) => t.length > 2 && !["the", "and", "for", "bar", "soap", "candle", "candles"].includes(t));
  if (tokens.length === 0) return null;

  return (
    catalog.find((p) => {
      const title = normalizeProductTitle(p.name);
      return tokens.every((token) => title.includes(token));
    }) ?? null
  );
}

function toMatchedProduct(ref: RitualProductRef, catalog: ShopifyProduct[]): MatchedProduct {
  const product = findProduct(catalog, ref);
  return {
    name: product?.name ?? ref.name,
    product,
  };
}

export function resolveProductPair(
  element: ElementId,
  sanctuary: SanctuaryId,
  hz: number,
  catalog: ShopifyProduct[] = [],
): ProductPair {
  const band = getFrequencyBand(hz).id;
  const copy = AURA_BY_SANCTUARY_BAND[sanctuary][band];
  const theme = AURA_THEME_BY_SANCTUARY[sanctuary];

  return {
    candle: toMatchedProduct(CANDLE_BY_ELEMENT[element], catalog),
    soap: toMatchedProduct(SOAP_BY_SANCTUARY[sanctuary], catalog),
    aura: {
      title: copy.title,
      body: copy.body,
      code: RITUAL_CODE,
      ...theme,
    },
  };
}
