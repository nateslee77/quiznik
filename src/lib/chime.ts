import { useSyncExternalStore } from "react";

export type ChimeState = "correct" | "wrong";

type SynthChime = { id: string; label: string; kind: "synth"; play: (audioCtx: AudioContext, now: number) => void };
type AudioChime = { id: string; label: string; kind: "audio"; src: string };
export type ChimeOption = SynthChime | AudioChime;

// ---- synthesis helpers (used by the two built-in correct chimes) ---------

// The one peak gain every synth note plays at — matched to TARGET_PEAK
// below (Web Audio's oscillator+gain-envelope scale isn't the same as a
// decoded buffer's sample amplitude, so this is a separately-tuned value,
// not literally equal to it, but picked to sound comparably loud).
const SYNTH_PEAK_GAIN = 0.16;

function tone(
  audioCtx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gain: number,
  type: OscillatorType = "sine",
) {
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(gain, startTime + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(env).connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export const CORRECT_CHIMES: ChimeOption[] = [
  {
    id: "correct-bright",
    label: "Bright",
    kind: "synth",
    // Both notes share SYNTH_PEAK_GAIN (see below) so "Bright" doesn't play
    // louder than "Sparkle" just because of which gain someone typed in.
    play: (audioCtx, now) => {
      tone(audioCtx, 880, now, 0.18, SYNTH_PEAK_GAIN); // A5
      tone(audioCtx, 1318.5, now + 0.09, 0.22, SYNTH_PEAK_GAIN); // E6
    },
  },
  {
    id: "correct-sparkle",
    label: "Sparkle",
    kind: "synth",
    play: (audioCtx, now) => {
      tone(audioCtx, 1046.5, now, 0.12, SYNTH_PEAK_GAIN, "triangle"); // C6
      tone(audioCtx, 1318.5, now + 0.07, 0.12, SYNTH_PEAK_GAIN, "triangle"); // E6
      tone(audioCtx, 1568, now + 0.14, 0.18, SYNTH_PEAK_GAIN, "triangle"); // G6
    },
  },
  { id: "correct-anime-wow", label: "Anime Wow", kind: "audio", src: "/sounds/correct-anime-wow.mp3" },
  { id: "correct-applepay", label: "Apple Pay", kind: "audio", src: "/sounds/correct-applepay.mp3" },
  { id: "correct-money", label: "Money", kind: "audio", src: "/sounds/correct-money.mp3" },
];

export const WRONG_CHIMES: ChimeOption[] = [
  { id: "wrong-faaah", label: "Faaah", kind: "audio", src: "/sounds/wrong-faaah.mp3" },
  { id: "wrong-dry-fart", label: "Dry Fart", kind: "audio", src: "/sounds/wrong-dry-fart.mp3" },
  { id: "wrong-vine-boom", label: "Vine Boom", kind: "audio", src: "/sounds/wrong-vine-boom.mp3" },
  { id: "wrong-slap", label: "Slap", kind: "audio", src: "/sounds/wrong-slap.mp3" },
  { id: "wrong-rizzbot-laugh", label: "Rizzbot Laugh", kind: "audio", src: "/sounds/wrong-rizzbot-laugh.mp3" },
];

const ALL_CHIMES = [...CORRECT_CHIMES, ...WRONG_CHIMES];

// ---- enabled/disabled state (per-chime-id, persisted client-side) --------

const STORAGE_KEY = "quiznik-chime-settings";

function defaultEnabled(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const c of ALL_CHIMES) map[c.id] = true;
  return map;
}

let enabled: Record<string, boolean> = defaultEnabled();
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
  } catch {
    // storage unavailable — setting just won't persist across visits
  }
}

// Server always renders the all-enabled default (no access to
// localStorage); the real saved state is read lazily on first client call,
// same pattern as the mascot's saved drag position.
function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) enabled = { ...defaultEnabled(), ...JSON.parse(raw) };
  } catch {
    // ignore malformed storage — keep defaults
  }
}

export function isChimeEnabled(id: string): boolean {
  ensureHydrated();
  return enabled[id] ?? true;
}

export function getChimeSettingsSnapshot(): Record<string, boolean> {
  ensureHydrated();
  return enabled;
}

export function setChimeEnabled(id: string, value: boolean) {
  ensureHydrated();
  enabled = { ...enabled, [id]: value };
  persist();
  notify();
}

function subscribe(cb: () => void): () => void {
  ensureHydrated();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Lets Settings UI reactively show/toggle the current enabled state, while
// playCorrectChime/playWrongChime below read the same store imperatively
// from plain event handlers (no hook needed there).
export function useChimeSettings(): Record<string, boolean> {
  return useSyncExternalStore(subscribe, getChimeSettingsSnapshot, defaultEnabled);
}

// ---- playback ---------------------------------------------------------

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const isNew = !ctx;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  if (isNew) warmAudioChimes(ctx);
  return ctx;
}

// ---- loudness normalization for the mp3-backed chimes --------------------
//
// The correct/wrong mp3s came from different sources with wildly different
// mastering levels, so playing them all at one flat HTMLAudioElement volume
// (the old approach) meant some chimes were jarringly louder than others.
// Fixing that for real means measuring each file's own peak sample and
// scaling playback gain to bring every chime to the same target peak — an
// HTMLAudioElement's `.volume` can't do that (it has no idea how loud the
// source material already is), so this decodes each file once via Web Audio
// and plays it back through a GainNode carrying the computed correction.
const TARGET_PEAK = 0.5;
const MAX_NORMALIZE_GAIN = 4; // cap so a near-silent source file doesn't get blasted to full volume from noise floor alone
const normalizedChimes = new Map<string, Promise<{ buffer: AudioBuffer; gain: number } | null>>();

function peakAmplitude(buffer: AudioBuffer): number {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
  }
  return peak;
}

function loadNormalizedChime(audioCtx: AudioContext, src: string): Promise<{ buffer: AudioBuffer; gain: number } | null> {
  let entry = normalizedChimes.get(src);
  if (!entry) {
    entry = fetch(src)
      .then((res) => res.arrayBuffer())
      .then((data) => audioCtx.decodeAudioData(data))
      .then((buffer) => {
        const peak = peakAmplitude(buffer);
        const gain = peak > 0 ? Math.min(MAX_NORMALIZE_GAIN, TARGET_PEAK / peak) : 1;
        return { buffer, gain };
      })
      .catch(() => null);
    normalizedChimes.set(src, entry);
  }
  return entry;
}

// Kicks off decoding/measuring every mp3 chime as soon as an AudioContext
// exists, so by the time round-robin playback actually reaches any given
// chime it's almost always already normalized — only the very first chime
// played in a session risks falling back to unnormalized playback below.
function warmAudioChimes(audioCtx: AudioContext) {
  for (const chime of ALL_CHIMES) {
    if (chime.kind === "audio") void loadNormalizedChime(audioCtx, chime.src);
  }
}

function playNormalizedAudioChime(audioCtx: AudioContext, src: string) {
  void loadNormalizedChime(audioCtx, src).then((result) => {
    if (!result) {
      playUnnormalizedFallback(src);
      return;
    }
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    source.buffer = result.buffer;
    gainNode.gain.value = result.gain;
    source.connect(gainNode).connect(audioCtx.destination);
    source.start();
  });
}

// Only reached if decoding/fetching genuinely fails (e.g. an ancient
// browser without decodeAudioData support) — better an un-normalized sound
// than silence.
function playUnnormalizedFallback(src: string) {
  const audio = new Audio(src);
  audio.volume = 0.7;
  void audio.play().catch(() => {
    // autoplay/permission failure — silently no-op
  });
}

// Always plays this exact option, regardless of its enabled state — used by
// the Settings page's per-row Preview button so you can hear a chime before
// switching it on.
export function previewChime(option: ChimeOption) {
  const audioCtx = getContext();
  if (option.kind === "synth") {
    if (!audioCtx) return;
    option.play(audioCtx, audioCtx.currentTime);
    return;
  }
  if (!audioCtx) {
    if (typeof window !== "undefined") playUnnormalizedFallback(option.src);
    return;
  }
  playNormalizedAudioChime(audioCtx, option.src);
}

// Round-robin: every enabled chime for a state gets used in turn, one per
// call, so switching on more than one just adds variety instead of
// stacking sounds on top of each other.
const rotation: Record<ChimeState, number> = { correct: 0, wrong: 0 };

function pickNext(options: ChimeOption[], state: ChimeState): ChimeOption | null {
  const on = options.filter((o) => isChimeEnabled(o.id));
  if (on.length === 0) return null;
  const option = on[rotation[state] % on.length];
  rotation[state] += 1;
  return option;
}

// Called from a user-gesture-driven click handler on every correct answer.
export function playCorrectChime() {
  const option = pickNext(CORRECT_CHIMES, "correct");
  if (option) previewChime(option);
}

// Called from a user-gesture-driven click handler on every wrong answer.
export function playWrongChime() {
  const option = pickNext(WRONG_CHIMES, "wrong");
  if (option) previewChime(option);
}
