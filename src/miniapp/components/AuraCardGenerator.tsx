import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toBlob, toPng } from "html-to-image";
import { Loader2, Share2 } from "lucide-react";

export type AuraCardProps = {
  /** Ritual/aura title, e.g. "Hearth Anchor" */
  auraName: string;
  /** ~25-30 word ritual reading */
  description: string;
  /** Candle product image URL — ideally a transparent/dark-background PNG */
  candleImage: string;
  /** Soap product image URL — ideally a transparent/dark-background PNG */
  soapImage: string;
  candleName: string;
  soapName: string;
  /**
   * Gradient stop colors (top → bottom), as plain CSS color values — e.g.
   * "#451a03, #431407, #000000". Applied via an inline `background`
   * (not a Tailwind gradient utility) so it reliably survives export:
   * Tailwind v4's oklch/CSS-variable-based gradient utilities can fail to
   * round-trip through html-to-image's style cloning and silently render
   * as a flat color instead of a gradient.
   */
  gradientColors: string;
  /** Footer URL text */
  siteUrl?: string;
  /** Optional extra className for the outer wrapper (card + button stack) */
  className?: string;
};

/** Editorial serif used for the reading — matches `.miniapp-display` across the ritual mini-app. */
const DISPLAY_FONT = "'Cormorant Garamond', 'Times New Roman', serif";
/** Tracked-out label font — matches `.miniapp-root`, used site-wide for uppercase labels/branding. */
const LABEL_FONT = "'Cinzel', serif";

const LOGO_SRC = "/photos/logo.PNG";

const CARD_WIDTH = 360;
const CARD_HEIGHT = 640;

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug || "aura-card";
}

/** Minimal shape check so we don't depend on newer-than-baseline DOM lib typings for canShare. */
function canShareFiles(candidate: Navigator, files: File[]): boolean {
  const nav = candidate as Navigator & {
    canShare?: (data?: { files?: File[] }) => boolean;
  };
  if (typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files });
  } catch {
    return false;
  }
}

function sizeOf(value: Blob | string): number {
  return typeof value === "string" ? value.length : value.size;
}

/**
 * Waits for webfonts + every image inside the card to finish loading/decoding,
 * then gives the browser a couple of frames to settle layout before a snapshot
 * is taken.
 */
async function waitForCardReady(node: HTMLElement): Promise<void> {
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {
      // best effort — fall through
    }
  }

  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  );

  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * html-to-image (Safari especially) can produce a blank/partial first frame —
 * re-capture until the output stops growing in size.
 */
async function captureStable<T extends Blob | string>(capture: () => Promise<T>, attempts = 4): Promise<T> {
  let best = await capture();
  let bestSize = sizeOf(best);

  for (let i = 1; i < attempts; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const next = await capture();
    const nextSize = sizeOf(next);
    if (nextSize <= bestSize) break;
    best = next;
    bestSize = nextSize;
  }

  return best;
}

export function AuraCardGenerator({
  auraName,
  description,
  candleImage,
  soapImage,
  candleName,
  soapName,
  gradientColors,
  siteUrl = "fireandsoap.com/myaura",
  className = "",
}: AuraCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadPng(node: HTMLDivElement, filename: string): Promise<void> {
    const dataUrl = await captureStable(() => toPng(node, { pixelRatio: 2, cacheBust: true }));
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleShare() {
    const node = cardRef.current;
    if (!node || isGenerating) return;

    // Force the label swap into the DOM before any capture work runs.
    flushSync(() => {
      setIsGenerating(true);
      setError(null);
    });

    const filename = `${slugify(auraName)}-aura-card.png`;

    try {
      await waitForCardReady(node);

      const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

      if (hasNativeShare) {
        const blob = await captureStable(() =>
          toBlob(node, { pixelRatio: 2, cacheBust: true }).then((result) => {
            if (!result) throw new Error("Could not generate the aura card image.");
            return result;
          }),
        );

        const file = new File([blob], filename, { type: "image/png" });

        if (canShareFiles(navigator, [file])) {
          try {
            await navigator.share({
              files: [file],
              title: `My Aura — ${auraName}`,
              text: `I just discovered my aura ritual: ${auraName}. ${siteUrl}`,
            });
            return;
          } catch (shareError) {
            // A user-cancelled share sheet is not a real failure — just stop quietly.
            if (shareError instanceof Error && shareError.name === "AbortError") {
              return;
            }
            // Otherwise fall through to the download fallback below.
          }
        }
      }

      await downloadPng(node, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong generating your aura card.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/*
        Mobile: visually scale the preview so it fits without scrolling.
        cardRef stays unscaled for a full-res export (html-to-image clones the node itself).
      */}
      <div
        className="origin-top scale-[0.72] max-sm:mb-[calc((640px+56px)*-0.28)] sm:scale-100"
        style={{ width: CARD_WIDTH }}
      >
        <div className="flex flex-col items-center gap-4 sm:gap-5">
          <div
            ref={cardRef}
            className="relative flex flex-col"
            style={{
              width: CARD_WIDTH,
              minHeight: CARD_HEIGHT,
              fontFamily: DISPLAY_FONT,
              background: `linear-gradient(to bottom, ${gradientColors})`,
            }}
          >
            {/* Header */}
            <div className="flex flex-col items-center gap-2 px-6 pt-9 pb-6 text-center">
              <img
                src={LOGO_SRC}
                alt="Fire and Soap"
                className="object-contain"
                style={{ height: 44, width: 44 }}
              />
              <p
                className="uppercase text-white/90"
                style={{
                  fontFamily: LABEL_FONT,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.3em",
                  lineHeight: 1.6,
                }}
              >
                Fire and Soap
              </p>
              <p
                className="uppercase text-white/55"
                style={{ fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: "0.3em", lineHeight: 1.6 }}
              >
                My Aura
              </p>
            </div>

            {/* Reading box */}
            <div className="flex flex-1 flex-col items-center justify-center px-6">
              <div className="w-full border border-white/20 bg-white/5 px-6 py-8 text-center backdrop-blur-xs">
                <h2 className="text-3xl font-medium uppercase tracking-wide text-white">{auraName}</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-white/90">{description}</p>
              </div>
            </div>

            {/* Products */}
            <div className="bg-black px-6 pb-5 pt-6 text-center">
              <div className="mx-auto mb-5 h-px w-16 bg-white/25" aria-hidden />
              <p
                className="uppercase text-white/70"
                style={{ fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: "0.3em" }}
              >
                My Products
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={candleImage}
                    alt={candleName}
                    className="h-24 w-24 object-contain drop-shadow-lg"
                  />
                  <p
                    className="uppercase text-white/80"
                    style={{ fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: "0.15em" }}
                  >
                    {candleName}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={soapImage}
                    alt={soapName}
                    className="h-24 w-24 object-contain drop-shadow-lg"
                  />
                  <p
                    className="uppercase text-white/80"
                    style={{ fontFamily: LABEL_FONT, fontSize: 10, letterSpacing: "0.15em" }}
                  >
                    {soapName}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer URL — pinned to the very bottom edge of the card */}
            <div className="border-t border-white/10 bg-black px-6 pb-6 pt-3 text-center">
              <p
                className="uppercase text-white/50"
                style={{ fontFamily: LABEL_FONT, fontSize: 9, letterSpacing: "0.25em" }}
              >
                {siteUrl}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShare}
            disabled={isGenerating}
            aria-busy={isGenerating}
            style={{ width: CARD_WIDTH }}
            className="relative flex h-[3.25rem] items-center justify-center rounded-full border border-white/20 bg-white/5 text-[11px] tracking-[0.25em] uppercase text-white [-webkit-tap-highlight-color:transparent] hover:bg-white/10 active:bg-white/[0.07] disabled:cursor-not-allowed"
          >
            {/* Stacked labels — instant swap, no fade/overlap */}
            <span
              className={`absolute inset-0 flex items-center justify-center gap-2 ${
                isGenerating ? "invisible" : "visible"
              }`}
              aria-hidden={isGenerating}
            >
              <Share2 size={14} strokeWidth={1.5} />
              Save / Share Aura Card
            </span>
            <span
              className={`absolute inset-0 flex items-center justify-center gap-2 ${
                isGenerating ? "visible" : "invisible"
              }`}
              aria-hidden={!isGenerating}
            >
              <Loader2 size={14} className="animate-spin" strokeWidth={1.5} />
              Generating…
            </span>
          </button>

          {error && <p style={{ width: CARD_WIDTH }} className="text-center text-xs text-red-400">{error}</p>}
        </div>
      </div>
      {/* Spacer so the negative margin doesn't collapse into the next page section */}
      <div className="h-4 sm:hidden" aria-hidden />
    </div>
  );
}

export default AuraCardGenerator;
