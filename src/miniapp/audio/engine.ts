import type { SanctuaryId } from "../types";
import { SANCTUARIES } from "../data/sanctuaries";
import candlelightUrl from "../sound_files/candlelight.mp3";

const FADE_SEC = 1.35;
const SANCTUARY_LEVEL = 0.78;
const TONE_LEVEL = 0.04;
const CANDLE_LEVEL = 0.72;
const CANDLE_ID = "candlelight";

/**
 * Hertz tone + layered sanctuary stems.
 * Sanctuary changes crossfade; tone keeps playing underneath.
 */
export class RitualAudioEngine {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private toneGain: GainNode | null = null;
  private sanctuaryGain: GainNode | null = null;
  private sanctuarySource: AudioBufferSourceNode | null = null;
  private candleGain: GainNode | null = null;
  private candleSource: AudioBufferSourceNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loadJobs = new Map<string, Promise<AudioBuffer>>();
  private currentSanctuary: SanctuaryId | null = null;
  private toneStarted = false;
  private stopTimers = new Set<ReturnType<typeof setTimeout>>();

  async unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.toneGain = this.ctx.createGain();
      this.toneGain.gain.value = 0;
      this.toneGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  setHz(hz: number) {
    if (!this.ctx || !this.toneGain) return;
    if (!this.osc) {
      this.osc = this.ctx.createOscillator();
      this.osc.type = "sine";
      this.osc.frequency.value = hz;
      this.osc.connect(this.toneGain);
      this.osc.start();
      this.toneStarted = true;
    } else {
      this.osc.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.05);
    }
    if (this.toneStarted) {
      this.toneGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.toneGain.gain.setTargetAtTime(TONE_LEVEL, this.ctx.currentTime, 0.08);
    }
  }

  /** Prefetch all sanctuary stems (call when entering step 3). */
  async preloadSanctuaries() {
    await this.unlock();
    await Promise.all([
      ...SANCTUARIES.map((s) => this.ensureBuffer(s.id, s.soundUrl)),
      this.ensureBuffer(CANDLE_ID, candlelightUrl),
    ]);
  }

  async playSanctuary(id: SanctuaryId) {
    await this.unlock();
    if (!this.ctx) return;
    if (this.currentSanctuary === id && this.sanctuarySource) return;

    await this.ensureBuffer(id, SANCTUARIES.find((s) => s.id === id)?.soundUrl);
    const buffer = this.buffers.get(id);
    if (!buffer || !this.ctx) return;

    const now = this.ctx.currentTime;
    this.fadeOutCurrentSanctuary(now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(SANCTUARY_LEVEL, now + FADE_SEC);
    gain.connect(this.ctx.destination);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start(now);

    this.sanctuaryGain = gain;
    this.sanctuarySource = source;
    this.currentSanctuary = id;
  }

  async clearSanctuary() {
    if (!this.ctx) return;
    this.fadeOutCurrentSanctuary(this.ctx.currentTime);
    this.currentSanctuary = null;
    this.sanctuaryGain = null;
    this.sanctuarySource = null;
  }

  /** Soft handoff into candlelight after hold-to-light succeeds. */
  async playCandlelight() {
    await this.unlock();
    if (!this.ctx) return;

    await this.ensureBuffer(CANDLE_ID, candlelightUrl);
    const buffer = this.buffers.get(CANDLE_ID);
    if (!buffer || !this.ctx) return;

    const now = this.ctx.currentTime;

    if (this.toneGain) {
      this.toneGain.gain.cancelScheduledValues(now);
      this.toneGain.gain.setValueAtTime(this.toneGain.gain.value, now);
      this.toneGain.gain.linearRampToValueAtTime(0, now + FADE_SEC);
    }
    this.fadeOutCurrentSanctuary(now);
    this.currentSanctuary = null;
    this.sanctuaryGain = null;
    this.sanctuarySource = null;
    this.fadeOutCandle(now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(CANDLE_LEVEL, now + FADE_SEC);
    gain.connect(this.ctx.destination);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = false;
    source.connect(gain);
    source.start(now);

    this.candleGain = gain;
    this.candleSource = source;
  }

  hush() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.toneGain) {
      this.toneGain.gain.cancelScheduledValues(now);
      this.toneGain.gain.setValueAtTime(this.toneGain.gain.value, now);
      this.toneGain.gain.linearRampToValueAtTime(0, now + 0.45);
    }
    this.fadeOutCurrentSanctuary(now);
    this.fadeOutCandle(now);
    this.currentSanctuary = null;
    this.sanctuaryGain = null;
    this.sanctuarySource = null;
    this.candleGain = null;
    this.candleSource = null;
  }

  dispose() {
    this.stopTimers.forEach(clearTimeout);
    this.stopTimers.clear();
    try {
      this.osc?.stop();
    } catch {
      /* already stopped */
    }
    try {
      this.sanctuarySource?.stop();
    } catch {
      /* already stopped */
    }
    try {
      this.candleSource?.stop();
    } catch {
      /* already stopped */
    }
    this.osc = null;
    this.sanctuarySource = null;
    this.candleSource = null;
    void this.ctx?.close();
    this.ctx = null;
    this.toneGain = null;
    this.sanctuaryGain = null;
    this.candleGain = null;
    this.buffers.clear();
    this.loadJobs.clear();
    this.toneStarted = false;
    this.currentSanctuary = null;
  }

  private fadeOutCandle(now: number) {
    if (!this.ctx || !this.candleGain || !this.candleSource) return;
    const prevGain = this.candleGain;
    const prevSource = this.candleSource;
    const current = Math.max(0, prevGain.gain.value);
    prevGain.gain.cancelScheduledValues(now);
    prevGain.gain.setValueAtTime(current, now);
    prevGain.gain.linearRampToValueAtTime(0, now + FADE_SEC);
    const timer = setTimeout(() => {
      this.stopTimers.delete(timer);
      try {
        prevSource.stop();
      } catch {
        /* already stopped */
      }
      try {
        prevGain.disconnect();
      } catch {
        /* already disconnected */
      }
    }, FADE_SEC * 1000 + 80);
    this.stopTimers.add(timer);
  }

  private fadeOutCurrentSanctuary(now: number) {
    if (!this.ctx || !this.sanctuaryGain || !this.sanctuarySource) return;

    const prevGain = this.sanctuaryGain;
    const prevSource = this.sanctuarySource;
    const current = Math.max(0, prevGain.gain.value);

    prevGain.gain.cancelScheduledValues(now);
    prevGain.gain.setValueAtTime(current, now);
    prevGain.gain.linearRampToValueAtTime(0, now + FADE_SEC);

    const timer = setTimeout(() => {
      this.stopTimers.delete(timer);
      try {
        prevSource.stop();
      } catch {
        /* already stopped */
      }
      try {
        prevGain.disconnect();
      } catch {
        /* already disconnected */
      }
    }, FADE_SEC * 1000 + 80);
    this.stopTimers.add(timer);
  }

  private async ensureBuffer(id: string, url?: string) {
    if (!this.ctx || !url) return;
    if (this.buffers.has(id)) return;

    let job = this.loadJobs.get(id);
    if (!job) {
      job = (async () => {
        const response = await fetch(url);
        const data = await response.arrayBuffer();
        const buffer = await this.ctx!.decodeAudioData(data.slice(0));
        this.buffers.set(id, buffer);
        this.loadJobs.delete(id);
        return buffer;
      })();
      this.loadJobs.set(id, job);
    }
    await job;
  }
}
