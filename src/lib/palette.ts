import { useSyncExternalStore } from "react";

// Each id matches a `[data-palette="..."]` block in globals.css. `swatch`
// is that palette's rose-400 (its primary accent color) and `background`
// its page background, used together for the two-tone preview swatch in
// Settings — important once background varies too, since an accent dot
// alone wouldn't show that Midnight/Charcoal/Onyx are dark themes.
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
  | "lilac"
  | "midnight"
  | "charcoal"
  | "onyx";

export type PaletteOption = { id: PaletteId; label: string; swatch: string; background: string };

export const PALETTES: PaletteOption[] = [
  { id: "peach", label: "Peach Blossom", swatch: "#fb7185", background: "#fff7f0" },
  { id: "mint", label: "Minty Fresh", swatch: "#7bf1ca", background: "#fff7f0" },
  { id: "lavender", label: "Lavender Dream", swatch: "#ad7fed", background: "#fff7f0" },
  { id: "sky", label: "Sky Blossom", swatch: "#7bc0f1", background: "#fff7f0" },
  { id: "lemon", label: "Lemon Sorbet", swatch: "#f8d074", background: "#fff7f0" },
  { id: "bubblegum", label: "Bubblegum", swatch: "#fb71c1", background: "#fff7f0" },
  { id: "seafoam", label: "Seafoam", swatch: "#7fede4", background: "#fff7f0" },
  { id: "periwinkle", label: "Periwinkle", swatch: "#7b85f1", background: "#fff7f0" },
  { id: "coral", label: "Coral Reef", swatch: "#f88674", background: "#fff7f0" },
  { id: "lilac", label: "Lilac Fields", swatch: "#db7fed", background: "#fff7f0" },
  { id: "midnight", label: "Midnight", swatch: "#ad82ea", background: "#14121f" },
  { id: "charcoal", label: "Charcoal", swatch: "#f48878", background: "#242426" },
  { id: "onyx", label: "Onyx", swatch: "#f874b6", background: "#0a0a0b" },
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
