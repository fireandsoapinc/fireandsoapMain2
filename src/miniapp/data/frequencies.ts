export type FrequencyBandId = "low" | "mid" | "high";

export type FrequencyBand = {
  id: FrequencyBandId;
  //label: string;
  rangeLabel: string;
  minHz: number;
  maxHz: number;
  description: string;
};

/** Three intentional bands — slider maps across these, not empty gaps. */
export const FREQUENCY_BANDS: FrequencyBand[] = [
  {
    id: "low",
    /** *label: "Low Frequencies", */
    rangeLabel: "32 – 128 Hz",
    minHz: 32,
    maxHz: 128,
    description:
      "Deep physical tissue work, grounding, and reducing localized pain or inflammation.",
  },
  {
    id: "mid",
    /** *label: "Mid Frequencies", */
    rangeLabel: "136.1 – 256 Hz",
    minHz: 136.1,
    maxHz: 256,
    description:
      'Calm stress-related tension, balance energy centers, and clear mental focus.',
  },
  {
    id: "high",
    /** *label: "Higher Solfeggio & Transformation", */
    rangeLabel: "396 – 852 Hz",
    minHz: 396,
    maxHz: 852,
    description:
      "Encourage emotional release, meditation depth, and relaxation.",
  },
];

/** Slider 0–1 → Hz inside the three bands (equal thirds). */
export function hzFromSlider(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const segment = Math.min(2, Math.floor(clamped * 3));
  const local = clamped * 3 - segment;
  const band = FREQUENCY_BANDS[segment];
  return band.minHz + local * (band.maxHz - band.minHz);
}

export function sliderFromHz(hz: number): number {
  for (let i = 0; i < FREQUENCY_BANDS.length; i++) {
    const band = FREQUENCY_BANDS[i];
    if (hz >= band.minHz - 0.05 && hz <= band.maxHz + 0.05) {
      const local = (hz - band.minHz) / (band.maxHz - band.minHz);
      return (i + Math.max(0, Math.min(1, local))) / 3;
    }
  }
  if (hz < FREQUENCY_BANDS[0].minHz) return 0;
  return 1;
}

export function getFrequencyBand(hz: number): FrequencyBand {
  if (hz < 136) return FREQUENCY_BANDS[0];
  if (hz < 396) return FREQUENCY_BANDS[1];
  return FREQUENCY_BANDS[2];
}

/** Gradient blend from low (amber/warm) → high (teal/botanical). */
export function blendFromHz(hz: number): { warmth: number; botanical: number } {
  const t = sliderFromHz(hz);
  return { warmth: 1 - t, botanical: t };
}
