import { useSyncExternalStore } from "react";

// Each id matches a `[data-background="..."]` block in globals.css.
// Background only ever touches --pal-background/--pal-foreground/
// --pal-surface and the neutral amber/orange ramps — it's independent
// from the accent palette choice (see lib/palette.ts), so any background
// combines with any accent color.
export type BackgroundId = "cream" | "midnight" | "charcoal" | "onyx";

export type BackgroundOption = { id: BackgroundId; label: string; background: string; foreground: string };

export const BACKGROUNDS: BackgroundOption[] = [
  { id: "cream", label: "Cream", background: "#fff7f0", foreground: "#45322b" },
  { id: "midnight", label: "Midnight", background: "#14121f", foreground: "#d3cfe7" },
  { id: "charcoal", label: "Charcoal", background: "#242426", foreground: "#dddbd9" },
  { id: "onyx", label: "Onyx", background: "#0a0a0b", foreground: "#dcdbda" },
];

const DEFAULT_BACKGROUND: BackgroundId = "cream";
export const BACKGROUND_STORAGE_KEY = "quiznik-background";

let current: BackgroundId = DEFAULT_BACKGROUND;
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function applyToDom(id: BackgroundId) {
  if (typeof document !== "undefined") document.documentElement.setAttribute("data-background", id);
}

function persist(id: BackgroundId) {
  try {
    localStorage.setItem(BACKGROUND_STORAGE_KEY, id);
  } catch {
    // storage unavailable — choice just won't persist across visits
  }
}

// The root layout also inlines a blocking <script> that applies the saved
// background to <html> before first paint, so there's no flash of the
// default background on load — this is the same read for the React side
// of things, and a harmless no-op re-application if the inline script
// already ran.
function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(BACKGROUND_STORAGE_KEY);
    if (raw && BACKGROUNDS.some((b) => b.id === raw)) current = raw as BackgroundId;
  } catch {
    // ignore malformed storage — keep default
  }
  applyToDom(current);
}

export function getBackground(): BackgroundId {
  ensureHydrated();
  return current;
}

export function setBackground(id: BackgroundId) {
  ensureHydrated();
  current = id;
  persist(id);
  applyToDom(id);
  notify();
}

function subscribe(cb: () => void): () => void {
  ensureHydrated();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useBackground(): BackgroundId {
  return useSyncExternalStore(subscribe, getBackground, () => DEFAULT_BACKGROUND);
}
