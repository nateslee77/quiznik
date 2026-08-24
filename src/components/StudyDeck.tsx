"use client";

import { useEffect, useMemo, useState } from "react";
import { shuffle } from "@/lib/shuffle";
import { cardImageUrl } from "@/lib/supabase/storage";
import type { Card } from "@/lib/types";

function CardFace({
  card,
  label,
}: {
  card: Card;
  label: "Term" | "Definition";
}) {
  const imageUrl = cardImageUrl(card.image_path);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-900/10 bg-surface p-6 text-center shadow-sm [backface-visibility:hidden] lg:gap-4 lg:p-10">
      <span className="text-xs font-medium uppercase tracking-wide text-amber-950/60 lg:text-sm">
        {label}
      </span>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="max-h-32 max-w-full rounded-xl object-contain lg:max-h-48"
        />
      ) : null}
      <span className="text-balance text-xl font-medium sm:text-2xl lg:text-3xl">
        {label === "Term" ? card.term : card.definition}
      </span>
    </div>
  );
}

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

  if (cards.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-amber-950/50">This set has no cards yet.</p>
      </div>
    );
  }

  const atEnd = index === cards.length - 1;

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="mb-3 flex w-full max-w-md items-center justify-between text-sm text-amber-950/50 lg:max-w-2xl">
        <span>{progress}</span>
        <button
          onClick={toggleShuffle}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            shuffled
              ? "bg-rose-400 text-rose-contrast"
              : "border border-amber-900/20 text-amber-950/60"
          }`}
        >
          Shuffle
        </button>
      </div>

      <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-amber-200/60 lg:max-w-2xl">
        <div
          className="h-full rounded-full bg-rose-400 transition-all"
          style={{ width: `${((index + 1) / cards.length) * 100}%` }}
        />
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        aria-label="Flip card"
        className="relative my-8 w-full max-w-md cursor-pointer lg:max-w-2xl"
        style={{ perspective: "1200px" }}
      >
        <div className="invisible min-h-[22rem] w-full lg:min-h-[28rem]" aria-hidden />
        <div
          className="absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <CardFace card={current} label="Term" />
          <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <CardFace card={current} label="Definition" />
          </div>
        </div>
      </button>

      <p className="mb-6 text-xs text-amber-950/60">Tap the card, or press Space, to flip it.</p>

      <div className="flex w-full max-w-md items-center gap-3 lg:max-w-2xl">
        <button
          onClick={prev}
          disabled={index === 0}
          className="flex-1 rounded-lg border border-amber-900/20 px-4 py-3 text-sm font-medium text-amber-950/80 transition hover:bg-orange-100/70 disabled:opacity-40 lg:py-4 lg:text-base"
        >
          ← Prev
        </button>
        {atEnd ? (
          <button
            onClick={restart}
            className="flex-1 rounded-lg bg-rose-400 px-4 py-3 text-sm font-medium text-rose-contrast transition hover:bg-rose-300 lg:py-4 lg:text-base"
          >
            Restart
          </button>
        ) : (
          <button
            onClick={next}
            className="flex-1 rounded-lg bg-rose-400 px-4 py-3 text-sm font-medium text-rose-contrast transition hover:bg-rose-300 lg:py-4 lg:text-base"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
