import type { SanctuaryId } from "../types";
import { SANCTUARIES } from "../data/sanctuaries";

type Props = {
  selected: SanctuaryId | null;
  onSelect: (id: SanctuaryId) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function SanctuarySelect({ selected, onSelect, onContinue, onBack }: Props) {
  return (
    <div className="miniapp-step flex h-full min-h-0 flex-col px-5 pt-4 md:px-10">
      <header className="mb-4 shrink-0 text-center md:mb-6">
        <p className="mb-2 text-[10px] tracking-[0.35em] uppercase text-white/45">Step 3</p>
        <h2 className="miniapp-display text-2xl font-light text-white md:text-4xl">
          Choose your sanctuary.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
          Layer an ambient room over your frequency and personalize your energy field.
        </p>
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-3xl flex-1 content-start gap-3 overflow-y-auto overscroll-contain pb-4 sm:grid-cols-3 sm:content-center sm:overflow-visible sm:pb-0">
        {SANCTUARIES.map((s) => {
          const active = selected === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`relative flex flex-col items-center justify-center rounded-2xl border bg-white/[0.03] px-5 py-5 text-center transition duration-300 sm:min-h-[11rem] sm:py-6 ${
                active ? "border-white/45 bg-white/[0.06]" : "border-white/12 hover:border-white/28"
              }`}
            >
              <p className="miniapp-display text-xl font-light text-white">{s.label}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/55">{s.description}</p>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-0 z-10 -mx-5 mt-auto flex shrink-0 justify-center gap-3 border-t border-white/10 bg-[#080808]/95 px-5 py-4 backdrop-blur-sm md:-mx-10 md:px-10">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/15 px-6 py-3 text-[10px] tracking-[0.28em] uppercase text-white/70 hover:bg-white/5"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={onContinue}
          className="rounded-full border border-white/20 bg-white/5 px-8 py-3 text-[10px] tracking-[0.28em] uppercase text-white transition enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
