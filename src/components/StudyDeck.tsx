"use client";

import { useEffect, useMemo, useState } from "react";
import { shuffle } from "@/lib/shuffle";
import type { Card } from "@/lib/types";

export function StudyDeck({ cards }: { cards: Card[] }) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  const current = cards[order[index]];
  const progress = useMemo(() => `${index + 1} / ${cards.length}`, [index, cards.length]);

  function next() {
    setFlipped(false);
    setIndex((i) => Math.min(i + 1, cards.length - 1));
  }

  function prev() {
    setFlipped(false);
    setIndex((i) => Math.max(i - 1, 0));
  }

  function toggleShuffle() {
    setShuffled((s) => !s);
    setIndex(0);
    setFlipped(false);
    setOrder(shuffled ? cards.map((_, i) => i) : shuffle(cards.map((_, i) => i)));
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const atEnd = index === cards.length - 1;

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="mb-3 flex w-full items-center justify-between text-sm text-amber-950/50 dark:text-amber-950/60">
        <span>{progress}</span>
        <button
          onClick={toggleShuffle}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            shuffled
              ? "bg-rose-400 text-white"
              : "border border-amber-900/20 text-amber-950/60 dark:border-amber-900/20 dark:text-amber-950/80"
          }`}
        >
          Shuffle
        </button>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-200/60 dark:bg-amber-200/60">
        <div
          className="h-full rounded-full bg-rose-400 transition-all"
          style={{ width: `${((index + 1) / cards.length) * 100}%` }}
        />
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="my-8 flex aspect-[4/3] w-full max-w-md cursor-pointer items-center justify-center rounded-2xl border border-amber-900/10 bg-white p-8 text-center shadow-sm transition hover:shadow-md dark:border-amber-900/10 dark:bg-neutral-900"
        style={{ perspective: "1000px" }}
      >
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-amber-950/60">
            {flipped ? "Definition" : "Term"}
          </span>
          <span className="text-balance text-xl font-medium sm:text-2xl">
            {flipped ? current.definition : current.term}
          </span>
        </div>
      </button>

      <p className="mb-6 text-xs text-amber-950/60">Tap the card, or press Space, to flip it.</p>

      <div className="flex w-full max-w-md items-center gap-3">
        <button
          onClick={prev}
          disabled={index === 0}
          className="flex-1 rounded-lg border border-amber-900/20 px-4 py-3 text-sm font-medium text-amber-950/80 transition hover:bg-orange-100/70 disabled:opacity-40 dark:border-amber-900/20 dark:text-amber-950/80 dark:hover:bg-neutral-900"
        >
          ← Prev
        </button>
        {atEnd ? (
          <button
            onClick={restart}
            className="flex-1 rounded-lg bg-rose-400 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-300"
          >
            Restart
          </button>
        ) : (
          <button
            onClick={next}
            className="flex-1 rounded-lg bg-rose-400 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-300"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
