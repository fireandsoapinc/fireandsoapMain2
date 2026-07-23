import type { ElementId } from "../types";

export type ElementDef = {
  id: ElementId;
  label: string;
  signs: string;
  description: string;
  accent: string;
  glow: string;
  pulse: "ember" | "wave" | "bloom" | "breeze";
  /** Unicode zodiac glyphs (text presentation) that float on hover/active. */
  symbols: Array<{ glyph: string; name: string; x: string; y: string; size: string; delay: string }>;
};

/** Force text-style glyphs (not color emoji plates) via U+FE0E. */
const T = "\uFE0E";

export const ELEMENTS: ElementDef[] = [
  {
    id: "fire",
    label: "Fire Signs",
    signs: "Aries · Leo · Sagittarius",
    description: "Bold, magnetic, burning the candle at both ends.",
    accent: "#c45c26",
    glow: "rgba(196, 92, 38, 0.45)",
    pulse: "ember",
    symbols: [
      { glyph: `♈${T}`, name: "Aries", x: "28%", y: "32%", size: "4rem", delay: "0s" },
      { glyph: `♌${T}`, name: "Leo", x: "72%", y: "28%", size: "4.75rem", delay: "-1.2s" },
      { glyph: `♐${T}`, name: "Sagittarius", x: "50%", y: "58%", size: "3.75rem", delay: "-2.4s" },
    ],
  },
  {
    id: "earth",
    label: "Earth Signs",
    signs: "Taurus · Virgo · Capricorn",
    description: "Grounded, tactile, high-luxury aesthetic, low patience.",
    accent: "#6b7c4a",
    glow: "rgba(107, 124, 74, 0.45)",
    pulse: "bloom",
    symbols: [
      { glyph: `♉${T}`, name: "Taurus", x: "26%", y: "30%", size: "4.1rem", delay: "0s" },
      { glyph: `♍${T}`, name: "Virgo", x: "74%", y: "30%", size: "4.6rem", delay: "-1.4s" },
      { glyph: `♑${T}`, name: "Capricorn", x: "50%", y: "60%", size: "3.85rem", delay: "-2.6s" },
    ],
  },
  {
    id: "air",
    label: "Air Signs",
    signs: "Gemini · Libra · Aquarius",
    description: "Overthinking, ethereal, needs mental space to breathe.",
    accent: "#a8b4c4",
    glow: "rgba(168, 180, 196, 0.4)",
    pulse: "breeze",
    symbols: [
      { glyph: `♊${T}`, name: "Gemini", x: "27%", y: "34%", size: "4rem", delay: "0s" },
      { glyph: `♎${T}`, name: "Libra", x: "73%", y: "26%", size: "4.7rem", delay: "-1.1s" },
      { glyph: `♒${T}`, name: "Aquarius", x: "50%", y: "56%", size: "3.9rem", delay: "-2.2s" },
    ],
  },
  {
    id: "water",
    label: "Water Signs",
    signs: "Cancer · Scorpio · Pisces",
    description: "Deep feelers, sensory seekers, bath-ritual obsessed.",
    accent: "#4a8f9a",
    glow: "rgba(74, 143, 154, 0.45)",
    pulse: "wave",
    symbols: [
      { glyph: `♋${T}`, name: "Cancer", x: "28%", y: "28%", size: "4.2rem", delay: "0s" },
      { glyph: `♏${T}`, name: "Scorpio", x: "72%", y: "32%", size: "4.65rem", delay: "-1.5s" },
      { glyph: `♓${T}`, name: "Pisces", x: "50%", y: "58%", size: "3.95rem", delay: "-2.8s" },
    ],
  },
];
