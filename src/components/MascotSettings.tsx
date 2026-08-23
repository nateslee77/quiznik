"use client";

import { setMascotEnabled, useMascotEnabled } from "@/lib/mascotSettings";

export function MascotSettings() {
  const enabled = useMascotEnabled();

  return (
    <label className="flex items-center justify-between rounded-xl border border-amber-900/10 bg-white px-4 py-3 text-sm font-medium">
      <span>
        Show the floating mascot
        <span className="block text-xs font-normal text-amber-950/50">
          The draggable companion that reacts to correct/wrong answers. Turning this off just hides it —
          your progress and coins are unaffected.
        </span>
      </span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setMascotEnabled(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-rose-400"
      />
    </label>
  );
}
