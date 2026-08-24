"use client";

import { BACKGROUNDS, setBackground, useBackground } from "@/lib/background";

export function BackgroundSettings() {
  const current = useBackground();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {BACKGROUNDS.map((b) => {
        const active = current === b.id;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => setBackground(b.id)}
            aria-pressed={active}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition ${
              active ? "border-rose-400 bg-rose-50 ring-2 ring-rose-300" : "border-amber-900/10 hover:bg-orange-100/70"
            }`}
          >
            <span
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-black/10 shadow-sm"
              style={{ backgroundColor: b.background }}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: b.foreground }}
              />
            </span>
            <span className="text-xs font-medium">{b.label}</span>
          </button>
        );
      })}
    </div>
  );
}
