"use client";

import {
  CORRECT_CHIMES,
  WRONG_CHIMES,
  previewChime,
  setChimeEnabled,
  useChimeSettings,
  type ChimeOption,
} from "@/lib/chime";

function ChimeRow({ option, enabled }: { option: ChimeOption; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-900/10 bg-white px-4 py-3">
      <label className="flex flex-1 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setChimeEnabled(option.id, e.target.checked)}
          className="h-4 w-4 accent-rose-400"
        />
        {option.label}
      </label>
      <button
        type="button"
        onClick={() => previewChime(option)}
        className="shrink-0 rounded-lg border border-amber-900/20 px-3 py-1 text-xs font-medium text-amber-950/60 transition hover:bg-orange-100/70"
      >
        ▶ Preview
      </button>
    </div>
  );
}

export function SoundSettings() {
  const enabledMap = useChimeSettings();
  const anyCorrectOn = CORRECT_CHIMES.some((c) => enabledMap[c.id]);
  const anyWrongOn = WRONG_CHIMES.some((c) => enabledMap[c.id]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-1 text-sm font-semibold">Correct answer</h3>
        <p className="mb-3 text-xs text-amber-950/50">
          {anyCorrectOn
            ? "Pick one or more — with more than one on, they take turns each time you get one right."
            : "All off — no sound will play on a correct answer."}
        </p>
        <div className="flex flex-col gap-2">
          {CORRECT_CHIMES.map((option) => (
            <ChimeRow key={option.id} option={option} enabled={enabledMap[option.id] ?? true} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Wrong answer</h3>
        <p className="mb-3 text-xs text-amber-950/50">
          {anyWrongOn
            ? "Pick one or more — with more than one on, they take turns each time you miss one."
            : "All off — no sound will play on a wrong answer."}
        </p>
        <div className="flex flex-col gap-2">
          {WRONG_CHIMES.map((option) => (
            <ChimeRow key={option.id} option={option} enabled={enabledMap[option.id] ?? true} />
          ))}
        </div>
      </div>
    </div>
  );
}
