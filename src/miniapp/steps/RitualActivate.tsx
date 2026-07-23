import { useEffect, useRef, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import type { ShopifyProduct } from "@/lib/shopify";
import { AuraCardGenerator } from "../components/AuraCardGenerator";
import type { MatchedProduct, RitualDraft, SanctuaryId } from "../types";
import candleUnlit from "../sound_files/FSUNLIT.png";
import candleLit from "../sound_files/FSLIT.png";

type Props = {
  draft: RitualDraft;
  onReveal: () => void;
  onExit: () => void;
  onViewProduct: (productId: string) => void;
  onAddToCart: (product: ShopifyProduct, quantity?: number) => void;
};

const HOLD_MS = 1400;
/** Slightly longer on touch so accidental taps don't complete the light. */
const HOLD_MS_TOUCH = 1800;
const FLASH_MS = 700;
const LIT_HOLD_MS = 2400;

type LightPhase = "unlit" | "flash" | "lit" | "aura";

/**
 * Share-card background per sanctuary — mirrors each room's ambient palette.
 * Plain hex stops (top → bottom), NOT Tailwind gradient classes: Tailwind v4's
 * oklch/CSS-variable-based gradient utilities can fail to survive
 * html-to-image's export and render as a flat color instead of a gradient.
 *
 * Top stop is deliberately a step lighter than the "via" stop so the
 * gradient reads as an actual gradient rather than a near-flat block —
 * amber-950/orange-950 (and emerald-950/neutral-950) are too close in
 * lightness to each other to show visible depth on their own.
 */
const CARD_GRADIENT_BY_SANCTUARY: Record<SanctuaryId, string> = {
  "rain-cedar": "#064e3b, #0a0a0a, #000000",
  "crackling-hearth": "#7c2d12, #0a0a0a, #000000",
  "ocean-waves": "#082f49, #020617, #000000",
};

function isCoarsePointer(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function RitualActivate({ draft, onReveal, onExit, onViewProduct, onAddToCart }: Props) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  // Resume on the aura card only when remounting with an already-revealed draft
  // (e.g. browser Back from a product). Do NOT jump to aura when revealed flips
  // mid-sequence — that is what caused the card to flash twice.
  const [phase, setPhase] = useState<LightPhase>(() => (draft.revealed ? "aura" : "unlit"));
  const [added, setAdded] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const holdingRef = useRef(false);
  const holdMsRef = useRef(HOLD_MS);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pair = draft.productPair;
  const aura = pair?.aura;
  const showAura = phase === "aura" && Boolean(aura);
  const litVisible = phase !== "unlit";

  const hasCart = Boolean(pair?.candle.product || pair?.soap.product);

  const handleAddBoth = () => {
    if (!pair) return;
    if (pair.candle.product) onAddToCart(pair.candle.product, 1);
    if (pair.soap.product) onAddToCart(pair.soap.product, 1);
    setAdded(true);
    clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => setAdded(false), 1800);
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach(clearTimeout);
      clearTimeout(addedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // Only reset when the draft is cleared — never force "aura" while lighting.
    if (!draft.revealed) {
      setPhase("unlit");
      setProgress(0);
      holdingRef.current = false;
      setHolding(false);
    }
  }, [draft.revealed]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const clearHold = () => {
    cancelAnimationFrame(rafRef.current);
    holdingRef.current = false;
    setHolding(false);
    setProgress(0);
  };

  const tick = (now: number) => {
    if (!holdingRef.current) return;
    const elapsed = now - startRef.current;
    const next = Math.min(1, elapsed / holdMsRef.current);
    setProgress(next);
    if (next >= 1) {
      holdingRef.current = false;
      setHolding(false);
      setPhase("flash");
      onReveal();
      clearTimers();
      const toLit = setTimeout(() => {
        setPhase("lit");
        const toAura = setTimeout(() => setPhase("aura"), LIT_HOLD_MS);
        timersRef.current.push(toAura);
      }, FLASH_MS);
      timersRef.current.push(toLit);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const beginHold = () => {
    if (draft.revealed || phase !== "unlit") return;
    holdMsRef.current = isCoarsePointer() ? HOLD_MS_TOUCH : HOLD_MS;
    holdingRef.current = true;
    setHolding(true);
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <div className="miniapp-step relative h-full overflow-hidden">
      {/* Bottom fade — softer on mobile so the candle/card aren’t crushed by black */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-56 bg-gradient-to-t from-black/80 via-black/55 to-transparent md:h-64 md:from-black md:via-black/80 md:to-transparent"
        aria-hidden
      />

      <div className="miniapp-candle-stage absolute inset-x-0 z-0">
        <button
          type="button"
          className="absolute inset-0 select-none bg-transparent"
          style={{ touchAction: "none" }}
          disabled={phase !== "unlit"}
          aria-label="Hold to lock in your ritual."
          onPointerDown={(e) => {
            if (phase !== "unlit") return;
            // Ignore non-primary mouse buttons; touch/pen are fine.
            if (e.pointerType === "mouse" && e.button !== 0) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            beginHold();
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            // Don't cancel after a successful light — only abort an in-progress hold.
            if (holdingRef.current) clearHold();
          }}
          onPointerCancel={() => {
            if (holdingRef.current) clearHold();
          }}
        >
          <div className="miniapp-candle-frame absolute inset-0">
            <img
              src={candleUnlit}
              alt=""
              className={`miniapp-candle-frame-img pointer-events-none absolute ${
                litVisible ? "opacity-0" : "opacity-100"
              }`}
              draggable={false}
            />
            <img
              src={candleLit}
              alt=""
              className={`miniapp-candle-frame-img pointer-events-none absolute ${
                litVisible ? "opacity-100" : "opacity-0"
              }`}
              draggable={false}
            />
            {phase === "unlit" && (
              <div className="miniapp-hold-ring pointer-events-none" aria-hidden>
                <svg className="-rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="rgba(201,168,124,0.25)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#C9A87C"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
                    style={{ transition: holding ? "none" : "stroke-dashoffset 120ms linear" }}
                  />
                </svg>
              </div>
            )}
            {phase === "flash" && (
              <div className="miniapp-light-flash pointer-events-none" aria-hidden />
            )}
          </div>
        </button>
      </div>

      {!showAura && (
        <div className="relative z-10 flex h-auto max-h-[42%] flex-col px-5 pt-3 md:max-h-[48%] md:px-10 md:pt-4">
          <header className="shrink-0 text-center">
            <p className="mb-3 text-[10px] tracking-[0.35em] uppercase text-white/45">Step 4</p>
            <h2 className="miniapp-display text-3xl font-light text-white md:text-4xl">
              Hold to lock in your aura.
            </h2>

            <p className="mx-auto mt-4 max-w-md text-sm text-white/50">
              {phase === "flash" || phase === "lit"
                ? "The flame catches…"
                : "Press and hold until the circle fills."}
            </p>
          </header>
        </div>
      )}

      {showAura && aura && pair && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-y-auto overscroll-contain px-4 py-3 md:px-10 md:py-4">
          <div className="miniapp-reveal pointer-events-auto my-auto w-full max-w-md shrink-0 rounded-2xl border border-white/15 bg-black px-4 py-4 text-center sm:px-5 sm:py-6 md:px-7 md:py-7">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/45">Your Aura</p>
            <h3 className="miniapp-display mt-2 text-xl font-light text-white md:text-xl">
              {aura.title}
            </h3>
            <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-white/70 sm:mt-3 md:text-sm md:text-white/55">
              {aura.body}
            </p>

            <p className="mt-4 text-[10px] tracking-[0.28em] uppercase text-white/45 sm:mt-6">
              Chosen for your energy
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4">
              <ChosenProductTile label="Candle" item={pair.candle} onViewProduct={onViewProduct} />
              <ChosenProductTile label="Soap" item={pair.soap} onViewProduct={onViewProduct} />
            </div>

            <p className="mt-4 text-[10px] tracking-[0.28em] uppercase text-white/45 sm:mt-6">
              Your aura code — 10% off
            </p>
            <p className="miniapp-display mt-1.5 text-xl font-light tracking-[0.12em] text-white sm:mt-2 sm:text-2xl md:text-3xl">
              {aura.code}
            </p>

            {hasCart && (
              <button
                type="button"
                onClick={handleAddBoth}
                className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-[10px] tracking-[0.28em] uppercase text-white/80 transition hover:bg-white/10 sm:mt-5 sm:py-3"
              >
                <ShoppingBag size={13} strokeWidth={1.5} />
                {added ? "Added to cart" : "Add both to cart"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-[10px] tracking-[0.28em] uppercase text-white transition-[background-color] duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-white/10 active:bg-white/[0.07] sm:mt-2.5 sm:py-3.5"
            >
              Share your aura card
            </button>
          </div>
        </div>
      )}

      {showShare && aura && pair && draft.sanctuary && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/95 px-3 py-6 sm:px-4 sm:py-8"
          onClick={() => setShowShare(false)}
        >
          <div className="relative animate-[miniapp-unveil_0.35s_ease_forwards]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowShare(false)}
              className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black text-white/80 transition hover:bg-white/10 [-webkit-tap-highlight-color:transparent] sm:-top-3 sm:-right-3 sm:h-9 sm:w-9"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
            <AuraCardGenerator
              auraName={aura.title}
              description={aura.body}
              candleImage={pair.candle.product?.image ?? candleLit}
              soapImage={pair.soap.product?.image ?? candleLit}
              candleName={pair.candle.name}
              soapName={pair.soap.name}
              gradientColors={CARD_GRADIENT_BY_SANCTUARY[draft.sanctuary]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ChosenProductTile({
  label,
  item,
  onViewProduct,
}: {
  label: string;
  item: MatchedProduct;
  onViewProduct: (productId: string) => void;
}) {
  const product = item.product;

  return (
    <div className="text-center text-white">
      <p className="mb-1.5 text-[9px] tracking-[0.22em] uppercase text-white/45 sm:mb-2">{label}</p>
      {product ? (
        <button
          type="button"
          onClick={() => onViewProduct(product.id)}
          className="group flex w-full flex-col items-center gap-1.5 text-center sm:gap-2.5"
          aria-label={`View ${item.name}`}
        >
          <span className="block aspect-square w-full max-w-[5.25rem] overflow-hidden rounded-xl bg-white/[0.04] sm:max-w-[8.5rem]">
            <img
              src={product.image}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </span>
          <span className="text-[9px] leading-snug text-white/65 underline decoration-transparent transition-colors group-hover:decoration-current sm:text-xs md:text-sm sm:text-white/80">
            {item.name}
          </span>
        </button>
      ) : (
        <p className="text-[9px] text-white/65 sm:text-sm sm:text-white/80">{item.name}</p>
      )}
    </div>
  );
}
