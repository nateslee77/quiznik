import { useSyncExternalStore } from "react";

const STORAGE_KEY = "quiznik-mascot-enabled";

let enabled = true;
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) enabled = raw === "1";
  } catch {
    // ignore malformed storage — keep default (on)
  }
}

export function isMascotEnabled(): boolean {
  ensureHydrated();
  return enabled;
}

export function setMascotEnabled(value: boolean) {
  ensureHydrated();
  enabled = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // storage unavailable — setting just won't persist across visits
  }
  notify();
}

function subscribe(cb: () => void): () => void {
  ensureHydrated();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Only gates the floating draggable companion (DockedMascot) — mascot
// artwork used as plain decorative content elsewhere (the home page banner,
// Shop skins) isn't the intrusive "always on screen" thing this toggle is
// for, so it stays unaffected.
export function useMascotEnabled(): boolean {
  return useSyncExternalStore(subscribe, isMascotEnabled, () => true);
}
