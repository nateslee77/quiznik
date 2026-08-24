import { useSyncExternalStore } from "react";

// Each id matches a `[data-palette="..."]` block in globals.css. `swatch`
// is that palette's rose-400 (its primary accent color), used for the
// preview dot in Settings. Palette only ever touches --pal-rose-* — it's
// independent from the background choice (see lib/background.ts), so any
// accent color combines with any background.
export type PaletteId =
  | "peach"
  | "mint"
  | "lavender"
  | "sky"
  | "lemon"
  | "bubblegum"
  | "seafoam"
  | "periwinkle"
  | "coral"
  | "lilac";

export type PaletteOption = { id: PaletteId; label: string; swatch: string };

export const PALETTES: PaletteOption[] = [
  { id: "peach", label: "Peach Blossom", swatch: "#fb7185" },
  { id: "mint", label: "Minty Fresh", swatch: "#7bf1ca" },
  { id: "lavender", label: "Lavender Dream", swatch: "#ad7fed" },
  { id: "sky", label: "Sky Blossom", swatch: "#7bc0f1" },
  { id: "lemon", label: "Lemon Sorbet", swatch: "#f8d074" },
  { id: "bubblegum", label: "Bubblegum", swatch: "#fb71c1" },
  { id: "seafoam", label: "Seafoam", swatch: "#7fede4" },
  { id: "periwinkle", label: "Periwinkle", swatch: "#7b85f1" },
  { id: "coral", label: "Coral Reef", swatch: "#f88674" },
  { id: "lilac", label: "Lilac Fields", swatch: "#db7fed" },
];

const DEFAULT_PALETTE: PaletteId = "peach";
export const PALETTE_STORAGE_KEY = "quiznik-palette";

let current: PaletteId = DEFAULT_PALETTE;
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function applyToDom(id: PaletteId) {
  if (typeof document !== "undefined") document.documentElement.setAttribute("data-palette", id);
}

function persist(id: PaletteId) {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, id);
  } catch {
    // storage unavailable — choice just won't persist across visits
  }
}

// The root layout also inlines a blocking <script> that applies the saved
// palette to <html> before first paint, so there's no flash of the default
// palette on load — this is the same read for the React side of things,
// and a harmless no-op re-application if the inline script already ran.
function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (raw && PALETTES.some((p) => p.id === raw)) current = raw as PaletteId;
  } catch {
    // ignore malformed storage — keep default
  }
  applyToDom(current);
}

export function getPalette(): PaletteId {
  ensureHydrated();
  return current;
}

export function setPalette(id: PaletteId) {
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

export function usePalette(): PaletteId {
  return useSyncExternalStore(subscribe, getPalette, () => DEFAULT_PALETTE);
}
