import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { fetchShopifyProducts, type ShopifyProduct } from "@/lib/shopify";
import { RitualAudioEngine } from "./audio/engine";
import { resolveProductPair } from "./data/productMap";
import { SANCTUARIES } from "./data/sanctuaries";
import { ElementSelect } from "./steps/ElementSelect";
import { FrequencyTuner } from "./steps/FrequencyTuner";
import { SanctuarySelect } from "./steps/SanctuarySelect";
import { RitualActivate } from "./steps/RitualActivate";
import { INITIAL_DRAFT, type RitualDraft } from "./types";
import "./miniapp.css";

type Props = {
  onExit: () => void;
  /** Pre-fetched Shopify catalog (from App) — avoids a duplicate fetch when available. */
  catalog?: ShopifyProduct[];
  onViewProduct: (productId: string) => void;
  onAddToCart: (product: ShopifyProduct, quantity?: number) => void;
};

/** Survives product-page navigation (MiniApp unmounts) so browser Back can resume the quiz. */
const RITUAL_DRAFT_KEY = "fs-ritual-draft";

function readStoredDraft(): RitualDraft {
  try {
    const raw = sessionStorage.getItem(RITUAL_DRAFT_KEY);
    if (!raw) return INITIAL_DRAFT;
    const parsed = JSON.parse(raw) as RitualDraft;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      ![1, 2, 3, 4].includes(parsed.step) ||
      typeof parsed.hz !== "number"
    ) {
      return INITIAL_DRAFT;
    }
    return { ...INITIAL_DRAFT, ...parsed };
  } catch {
    return INITIAL_DRAFT;
  }
}

function writeStoredDraft(draft: RitualDraft) {
  try {
    sessionStorage.setItem(RITUAL_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // quota / private mode — quiz still works in-memory for this session
  }
}

function clearStoredDraft() {
  try {
    sessionStorage.removeItem(RITUAL_DRAFT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Self-contained ritual mini-app.
 * Local ritual state; Shopify is only used at reveal for candle + soap picks.
 */
export default function MiniApp({ onExit, catalog, onViewProduct, onAddToCart }: Props) {
  const [draft, setDraft] = useState<RitualDraft>(readStoredDraft);
  const audioRef = useRef<RitualAudioEngine | null>(null);
  const catalogRef = useRef<ShopifyProduct[]>(catalog ?? []);

  useEffect(() => {
    writeStoredDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (catalog && catalog.length > 0) {
      catalogRef.current = catalog;
    }
  }, [catalog]);

  useEffect(() => {
    const engine = new RitualAudioEngine();
    audioRef.current = engine;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (catalogRef.current.length === 0) {
      void fetchShopifyProducts(50)
        .then((products) => {
          catalogRef.current = products;
        })
        .catch(() => {
          catalogRef.current = [];
        });
    }

    return () => {
      engine.dispose();
      audioRef.current = null;
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    if (draft.step !== 3) return;
    void audioRef.current?.preloadSanctuaries();
  }, [draft.step]);

  const unlockAudio = () => {
    void audioRef.current?.unlock();
  };

  const exitRitual = () => {
    audioRef.current?.hush();
    clearStoredDraft();
    onExit();
  };

  const showSanctuaryBg = draft.step >= 3;

  return (
    <div className="miniapp-root fixed inset-0 z-[60] flex flex-col bg-[#080808] text-white">
      <div className="miniapp-ambient pointer-events-none absolute inset-0" aria-hidden />

      {showSanctuaryBg &&
        SANCTUARIES.map((s) => {
          const active = draft.sanctuary === s.id;
          return (
            <div
              key={s.id}
              className={`miniapp-sanctuary-scene pointer-events-none absolute inset-0 ${
                active ? "is-active" : ""
              }`}
              style={{ backgroundColor: s.base }}
              aria-hidden
            >
              {s.orbs.map((orb, i) => (
                <span
                  key={`${s.id}-${i}`}
                  className="miniapp-sanctuary-orb"
                  style={{
                    width: orb.size,
                    height: orb.size,
                    left: orb.x,
                    top: orb.y,
                    background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
                    animationDelay: orb.delay,
                  }}
                />
              ))}
            </div>
          );
        })}

      <div className="relative z-10 flex items-center justify-between px-5 py-4 md:px-8">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/40">Fire and Soap</p>
          <p className="miniapp-display text-sm font-light text-white/80">My Aura</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex" aria-hidden>
            {([1, 2, 3, 4] as const).map((step) => (
              <span
                key={step}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  draft.step === step ? "bg-white" : draft.step > step ? "bg-white/50" : "bg-white/20"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={exitRitual}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 hover:bg-white/5 hover:text-white"
            aria-label="Exit ritual"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1">
        {draft.step === 1 && (
          <ElementSelect
            selected={draft.element}
            onSelect={(element) => {
              unlockAudio();
              setDraft((d) => ({ ...d, element }));
            }}
            onContinue={() => {
              if (!draft.element) return;
              unlockAudio();
              setDraft((d) => ({ ...d, step: 2 }));
            }}
          />
        )}

        {draft.step === 2 && (
          <FrequencyTuner
            hz={draft.hz}
            onChange={({ hz, warmth, botanical }) => {
              audioRef.current?.setHz(hz);
              setDraft((d) => ({ ...d, hz, warmth, botanical }));
            }}
            onBack={() => {
              audioRef.current?.hush();
              setDraft((d) => ({ ...d, step: 1 }));
            }}
            onContinue={() => {
              audioRef.current?.setHz(draft.hz);
              setDraft((d) => ({ ...d, step: 3 }));
            }}
          />
        )}

        {draft.step === 3 && (
          <SanctuarySelect
            selected={draft.sanctuary}
            onSelect={(sanctuary) => {
              audioRef.current?.setHz(draft.hz);
              void audioRef.current?.playSanctuary(sanctuary);
              setDraft((d) => ({ ...d, sanctuary }));
            }}
            onBack={() => {
              void audioRef.current?.clearSanctuary();
              setDraft((d) => ({ ...d, step: 2, sanctuary: null }));
            }}
            onContinue={() => {
              if (!draft.sanctuary) return;
              setDraft((d) => ({ ...d, step: 4 }));
            }}
          />
        )}

        {draft.step === 4 && (
          <RitualActivate
            draft={draft}
            onExit={exitRitual}
            onViewProduct={(productId) => {
              audioRef.current?.hush();
              onViewProduct(productId);
            }}
            onAddToCart={onAddToCart}
            onReveal={() => {
              if (!draft.element || !draft.sanctuary) return;
              void audioRef.current?.playCandlelight();
              const element = draft.element;
              const sanctuary = draft.sanctuary;
              const hz = draft.hz;
              const productPair = resolveProductPair(element, sanctuary, hz, catalogRef.current);
              setDraft((d) => ({ ...d, revealed: true, productPair }));

              if (catalogRef.current.length > 0) return;
              void fetchShopifyProducts(50)
                .then((products) => {
                  catalogRef.current = products;
                  setDraft((d) => ({
                    ...d,
                    productPair: resolveProductPair(element, sanctuary, hz, products),
                  }));
                })
                .catch(() => undefined);
            }}
          />
        )}
      </div>
    </div>
  );
}
