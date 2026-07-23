import type { SanctuaryId } from "../types";
import rainUrl from "../sound_files/rain.mp3";
import fireplaceUrl from "../sound_files/fireplace.mp3";
import oceanUrl from "../sound_files/oceanwaves.mp3";

export type SanctuaryDef = {
  id: SanctuaryId;
  label: string;
  description: string;
  /** Soft color stops for floating ambient layers. */
  orbs: Array<{ color: string; size: string; x: string; y: string; delay: string }>;
  base: string;
  soundUrl: string;
};

export const SANCTUARIES: SanctuaryDef[] = [
  {
    id: "rain-cedar",
    label: "Forest Rain",
    description: "Soft rainfall through evergreen quiet.",
    base: "#081012",
    orbs: [
      { color: "rgba(74, 143, 154, 0.38)", size: "55vmax", x: "18%", y: "22%", delay: "0s" },
      { color: "rgba(40, 90, 70, 0.32)", size: "48vmax", x: "72%", y: "68%", delay: "-4s" },
      { color: "rgba(90, 160, 150, 0.2)", size: "36vmax", x: "48%", y: "40%", delay: "-8s" },
    ],
    soundUrl: rainUrl,
  },
  {
    id: "crackling-hearth",
    label: "Crackling Hearth",
    description: "Low fire pop and warm wood hush.",
    base: "#120a06",
    orbs: [
      { color: "rgba(196, 92, 38, 0.4)", size: "58vmax", x: "30%", y: "18%", delay: "0s" },
      { color: "rgba(120, 40, 16, 0.34)", size: "50vmax", x: "78%", y: "72%", delay: "-5s" },
      { color: "rgba(220, 140, 70, 0.18)", size: "34vmax", x: "52%", y: "46%", delay: "-9s" },
    ],
    soundUrl: fireplaceUrl,
  },
  {
    id: "ocean-waves",
    label: "Ocean Waves",
    description: "Slow tide against open shoreline air.",
    base: "#060d14",
    orbs: [
      { color: "rgba(60, 120, 160, 0.38)", size: "56vmax", x: "22%", y: "28%", delay: "0s" },
      { color: "rgba(20, 50, 90, 0.36)", size: "52vmax", x: "76%", y: "70%", delay: "-6s" },
      { color: "rgba(100, 170, 190, 0.16)", size: "38vmax", x: "50%", y: "48%", delay: "-10s" },
    ],
    soundUrl: oceanUrl,
  },
];

export function getSanctuary(id: SanctuaryId | null): SanctuaryDef | undefined {
  if (!id) return undefined;
  return SANCTUARIES.find((s) => s.id === id);
}
