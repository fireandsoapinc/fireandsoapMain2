import type { CSSProperties } from "react";
import type { ElementId } from "../types";
import { ELEMENTS } from "../data/elements";

type Props = {
  selected: ElementId | null;
  onSelect: (id: ElementId) => void;
  onContinue: () => void;
};

export function ElementSelect({ selected, onSelect, onContinue }: Props) {
  return (
    <div className="miniapp-step flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-white/10 px-5 py-4 text-center md:px-10">
        <p className="mb-2 text-[10px] tracking-[0.35em] uppercase text-white/45">Step 1</p>
        <h2 className="miniapp-display text-2xl font-light text-white md:text-3xl">
          Select what fills your inner core.
        </h2>
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={!selected}
            onClick={onContinue}
            className="rounded-full border border-white/20 bg-white/5 px-8 py-3 text-[10px] tracking-[0.28em] uppercase text-white transition enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Continue
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 md:grid-cols-4 md:grid-rows-1">
        {ELEMENTS.map((el, index) => {
          const active = selected === el.id;
          const shortName = el.label.replace(" Signs", "").toUpperCase();

          return (
            <button
              key={el.id}
              type="button"
              onClick={() => onSelect(el.id)}
              className={`miniapp-pillar group relative flex h-full min-h-0 flex-col overflow-hidden text-left transition-[filter,background] duration-500 ${
                index % 2 !== 0 ? "border-l border-white/10" : ""
              } ${index >= 2 ? "border-t border-white/10 md:border-t-0" : ""} ${
                index > 0 ? "md:border-l md:border-white/10" : ""
              } ${active ? "brightness-110" : "hover:brightness-105"}`}
              style={
                {
                  "--miniapp-accent": el.accent,
                  "--miniapp-glow": el.glow,
                  background: `linear-gradient(180deg, #080808 0%, #0a0a0a 35%, ${el.accent}55 100%)`,
                } as CSSProperties
              }
            >
              <span
                className="absolute top-4 right-4 z-20 text-[10px] tracking-[0.32em] uppercase md:top-5 md:right-5"
                style={{ color: el.accent, opacity: 0.55 }}
              >
                {shortName}
              </span>

              {/* Decorative zodiac layer — upper-middle on mobile (above copy, not flush to top) */}
              <div
                className={`miniapp-zodiac-layer pointer-events-none absolute inset-x-0 top-[18%] z-0 h-[44%] md:inset-0 md:top-0 md:h-auto transition-opacity duration-500 ${
                  active
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                }`}
                aria-hidden
              >
                {el.symbols.map((symbol) => (
                  <span
                    key={symbol.name}
                    className="miniapp-zodiac-float absolute"
                    style={
                      {
                        left: symbol.x,
                        top: symbol.y,
                        fontSize: symbol.size,
                        animationDelay: symbol.delay,
                        "--zodiac-size": symbol.size,
                      } as CSSProperties
                    }
                  >
                    {symbol.glyph}
                  </span>
                ))}
              </div>

              <div className="relative z-10 mt-auto flex w-full min-h-0 flex-col items-start px-3 pb-4 pt-10 md:px-7 md:pb-12 md:pt-16">
                <p className="miniapp-display text-xl font-light leading-tight text-white sm:text-2xl md:text-4xl md:leading-none lg:text-[2.75rem]">
                  {el.label}
                </p>
                <p className="mt-1.5 text-xs text-white/55 md:mt-3 md:text-[15px]">{el.signs}</p>
                {/* Absolutely positioned so hover opacity never changes pillar height */}
                <p
                  className={`pointer-events-none absolute inset-x-3 bottom-4 max-w-[16rem] text-xs leading-snug text-white/80 transition-opacity duration-300 md:inset-x-7 md:bottom-12 md:text-sm md:leading-relaxed ${
                    active
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  }`}
                >
                  {el.description}
                </p>
                {/* Invisible spacer reserves description height so label block stays stable */}
                <p
                  className="invisible mt-2 max-w-[16rem] text-xs leading-snug md:mt-4 md:text-sm md:leading-relaxed"
                  aria-hidden
                >
                  {el.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
