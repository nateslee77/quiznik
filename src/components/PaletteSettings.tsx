"use client";

import { PALETTES, setPalette, usePalette } from "@/lib/palette";

export function PaletteSettings() {
  const current = usePalette();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {PALETTES.map((p) => {
        const active = current === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setPalette(p.id)}
            aria-pressed={active}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition ${
              active ? "border-rose-400 bg-rose-50 ring-2 ring-rose-300" : "border-amber-900/10 hover:bg-orange-100/70"
            }`}
          >
            <span
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-black/10 shadow-sm"
              style={{ backgroundColor: p.background }}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: p.swatch }}
              />
            </span>
            <span className="text-xs font-medium">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
