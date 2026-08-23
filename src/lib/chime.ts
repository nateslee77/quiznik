import { useSyncExternalStore } from "react";

export type ChimeState = "correct" | "wrong";

type SynthChime = { id: string; label: string; kind: "synth"; play: (audioCtx: AudioContext, now: number) => void };
type AudioChime = { id: string; label: string; kind: "audio"; src: string };
export type ChimeOption = SynthChime | AudioChime;

// ---- synthesis helpers (used by the two built-in correct chimes) ---------

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
    play: (audioCtx, now) => {
      tone(audioCtx, 880, now, 0.18, 0.18); // A5
      tone(audioCtx, 1318.5, now + 0.09, 0.22, 0.16); // E6
    },
  },
  {
    id: "correct-sparkle",
    label: "Sparkle",
    kind: "synth",
    play: (audioCtx, now) => {
      tone(audioCtx, 1046.5, now, 0.12, 0.13, "triangle"); // C6
      tone(audioCtx, 1318.5, now + 0.07, 0.12, 0.13, "triangle"); // E6
      tone(audioCtx, 1568, now + 0.14, 0.18, 0.13, "triangle"); // G6
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
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// Always plays this exact option, regardless of its enabled state — used by
// the Settings page's per-row Preview button so you can hear a chime before
// switching it on.
export function previewChime(option: ChimeOption) {
  if (option.kind === "synth") {
    const audioCtx = getContext();
    if (!audioCtx) return;
    option.play(audioCtx, audioCtx.currentTime);
    return;
  }
  if (typeof window === "undefined") return;
  const audio = new Audio(option.src);
  audio.volume = 0.7;
  void audio.play().catch(() => {
    // autoplay/permission failure — silently no-op
  });
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
