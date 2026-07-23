import { useEffect, useMemo, useRef } from "react";
import { blendFromHz, getFrequencyBand, hzFromSlider, sliderFromHz } from "../data/frequencies";

type Props = {
  hz: number;
  onChange: (next: { hz: number; warmth: number; botanical: number }) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function FrequencyTuner({ hz, onChange, onContinue, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hzRef = useRef(hz);
  hzRef.current = hz;

  const band = useMemo(() => getFrequencyBand(hz), [hz]);
  const sliderValue = sliderFromHz(hz);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    let running = true;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      if (!running) return;
      t += 0.016;
      const { width, height } = canvas.getBoundingClientRect();
      const currentHz = hzRef.current;
      const density = 0.008 + (currentHz / 852) * 0.018;
      const amp = height * (0.06 + (currentHz / 852) * 0.05);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, width, height);

      const waves = [
        { alpha: 0.22, speed: 1, phase: 0, y: 0.42 },
        { alpha: 0.14, speed: 0.7, phase: 1.4, y: 0.5 },
        { alpha: 0.1, speed: 1.25, phase: 2.6, y: 0.58 },
      ];

      for (const wave of waves) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(230, 220, 210, ${wave.alpha})`;
        ctx.lineWidth = 1.25;
        for (let x = 0; x <= width; x += 2) {
          const y =
            height * wave.y +
            Math.sin(x * density + t * wave.speed + wave.phase) * amp +
            Math.sin(x * density * 0.45 + t * wave.speed * 0.6) * amp * 0.35;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="miniapp-step relative flex h-full flex-col overflow-hidden px-5 pb-6 pt-4 md:px-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <canvas ref={canvasRef} className="h-full w-full" />
        <div className="absolute inset-0 bg-[#080808]/45" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <header className="mb-5 shrink-0 text-center">
          <p className="mb-2 text-[10px] tracking-[0.35em] uppercase text-white/45">Step 2</p>
          <h2 className="miniapp-display text-3xl font-light text-white md:text-4xl">Tune your frequency.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
            Move through the bands and feel the tone shift.
          </p>
        </header>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8">
          <div className="text-center">
            <p className="miniapp-display text-5xl font-light text-white tabular-nums">
              {hz < 100 ? hz.toFixed(1) : Math.round(hz)}
            </p>
            <p className="mt-2 text-[10px] tracking-[0.3em] uppercase text-white/40">Hertz</p>
          </div>

          <div className="miniapp-glass-card rounded-2xl border border-white/15 px-5 py-5 text-center">
            <p className="text-[10px] tracking-[0.28em] uppercase text-white/45">{band.rangeLabel}</p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{band.description}</p>
          </div>

          <label className="block space-y-4">
            <div className="flex justify-between text-[10px] tracking-[0.2em] uppercase text-white/40">
              <span>Low</span>
              <span>Mid</span>
              <span>High</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={sliderValue}
              onChange={(e) => {
                const nextHz = hzFromSlider(Number(e.target.value));
                const nextBlend = blendFromHz(nextHz);
                onChange({ hz: nextHz, ...nextBlend });
              }}
              className="miniapp-dial w-full"
              aria-label="Frequency"
            />
          </label>
        </div>

        <div className="mt-6 flex shrink-0 justify-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/15 px-6 py-3 text-[10px] tracking-[0.28em] uppercase text-white/70 hover:bg-white/5"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-full border border-white/20 bg-white/5 px-8 py-3 text-[10px] tracking-[0.28em] uppercase text-white hover:bg-white/10"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
