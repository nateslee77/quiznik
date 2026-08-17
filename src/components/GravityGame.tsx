"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Direction } from "@/lib/generateQuiz";
import { matchQuality } from "@/lib/fuzzyMatch";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useMascot } from "@/components/mascot/MascotContext";
import { useCoins } from "@/components/coins/CoinsContext";
import { GRAVITY_WORD_COINS, gravityCompletionBonus } from "@/lib/coins";
import { awardGameCoins } from "@/app/sets/actions";
import { GearIcon } from "@/components/icons";
import type { Card } from "@/lib/types";

type Phase = "setup" | "playing" | "gameover";
type FallingWord = {
  id: string;
  cardId: string;
  prompt: string;
  answer: string;
  durationMs: number;
  spawnedAt: number;
  leftPct: number;
};

const STARTING_LIVES = 3;
const MIN_SPAWN_MS = 1200;
const MAX_SPAWN_MS = 2500;
const MIN_FALL_MS = 3000;
const MAX_FALL_MS = 7000;

const DIRECTION_OPTIONS: { value: Direction | "mixed"; label: string }[] = [
  { value: "term-to-definition", label: "Term → Def" },
  { value: "definition-to-term", label: "Def → Term" },
  { value: "mixed", label: "Mixed" },
];

function wordTextFor(card: Card, direction: Direction | "mixed"): { prompt: string; answer: string } {
  const resolved: Direction =
    direction === "mixed" ? (Math.random() < 0.5 ? "term-to-definition" : "definition-to-term") : direction;
  return resolved === "term-to-definition"
    ? { prompt: card.term, answer: card.definition }
    : { prompt: card.definition, answer: card.term };
}

export function GravityGame({ setId, cards }: { setId: string; cards: Card[] }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [direction, setDirection] = useState<Direction | "mixed">("term-to-definition");

  const [words, setWords] = useState<FallingWord[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [input, setInput] = useState("");

  const scoreRef = useRef(0);
  const nextSpawnAtRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setState: setMascot } = useMascot();
  const { addCoins } = useCoins();

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    if (phase === "setup") setMascot("idle");
    else if (phase === "gameover") setMascot(score >= cards.length ? "celebrate" : "wrong");
    else setMascot("testing");
    return () => setMascot("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Derived during render (not an effect) — the same "adjust state from a
  // changed value" pattern used elsewhere in this app (e.g. FolderTree,
  // CardList's optimistic overlays) rather than a setState-in-effect.
  if (phase === "playing" && lives <= 0) {
    setPhase("gameover");
  }

  // Coins fire exactly once per game (phase flips -> "gameover" once per
  // startGame() call), same pattern as TestRunner/MatchGame.
  useEffect(() => {
    if (phase !== "gameover") return;
    const amount = score * GRAVITY_WORD_COINS + gravityCompletionBonus(score);
    addCoins(amount);
    void awardGameCoins(setId, amount, "gravity_complete");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function spawnWord() {
    setWords((prev) => {
      const fallingCardIds = new Set(prev.map((w) => w.cardId));
      const pool = cards.filter((c) => !fallingCardIds.has(c.id));
      const source = pool.length > 0 ? pool : cards;
      const card = source[Math.floor(Math.random() * source.length)];
      const { prompt, answer } = wordTextFor(card, direction);
      const durationMs = Math.max(MIN_FALL_MS, MAX_FALL_MS - scoreRef.current * 150);
      const word: FallingWord = {
        id: crypto.randomUUID(),
        cardId: card.id,
        prompt,
        answer,
        durationMs,
        spawnedAt: Date.now(),
        leftPct: 5 + Math.random() * 80,
      };
      return [...prev, word];
    });
  }

  // A short fixed-tick poller rather than re-arming setInterval on every
  // state change — spawning stays on schedule even if `words` changes
  // frequently (a word gets typed or lands) right before it was due.
  useEffect(() => {
    if (phase !== "playing") return;
    nextSpawnAtRef.current = Date.now() + 400;
    const tick = setInterval(() => {
      if (Date.now() < nextSpawnAtRef.current) return;
      spawnWord();
      const spawnIntervalMs = Math.max(MIN_SPAWN_MS, MAX_SPAWN_MS - scoreRef.current * 80);
      nextSpawnAtRef.current = Date.now() + spawnIntervalMs;
    }, 250);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function handleLand(wordId: string) {
    setWords((prev) => prev.filter((w) => w.id !== wordId));
    setLives((l) => Math.max(0, l - 1));
  }

  function submitGuess() {
    const typed = input.trim();
    if (!typed) return;
    const now = Date.now();
    let bestId: string | null = null;
    let bestProgress = -1;
    for (const w of words) {
      if (matchQuality(typed, w.answer) === "wrong") continue;
      const progress = (now - w.spawnedAt) / w.durationMs;
      if (progress > bestProgress) {
        bestProgress = progress;
        bestId = w.id;
      }
    }
    if (bestId) {
      setWords((prev) => prev.filter((w) => w.id !== bestId));
      setScore((s) => s + 1);
    }
    setInput("");
  }

  function startGame() {
    setWords([]);
    setScore(0);
    setLives(STARTING_LIVES);
    setInput("");
    setPhase("playing");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (phase === "setup") {
    return (
      <div className="rounded-2xl border border-amber-900/10 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <GearIcon className="h-5 w-5 text-amber-950/60" />
          <h2 className="text-lg font-medium">Gravity settings</h2>
        </div>

        <label className="mb-1.5 block text-sm font-medium text-amber-950/60">Direction</label>
        <SegmentedControl options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />

        <p className="mt-4 text-xs text-amber-950/50">
          Type the matching answer before each card reaches the bottom. You have {STARTING_LIVES}{" "}
          lives — the game speeds up the longer you last.
        </p>

        <button
          onClick={startGame}
          className="mt-6 w-full rounded-lg bg-rose-400 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-300"
        >
          Start
        </button>
      </div>
    );
  }

  if (phase === "gameover") {
    const amount = score * GRAVITY_WORD_COINS + gravityCompletionBonus(score);
    return (
      <div className="flex flex-1 flex-col items-center py-8 text-center">
        <p className="text-sm text-amber-950/50">Words survived</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">{score}</p>
        <p className="mt-2 text-sm text-amber-950/50">+{amount} coins</p>

        <div className="mt-8 flex w-full max-w-md gap-3">
          <button
            onClick={startGame}
            className="flex-1 rounded-lg bg-rose-400 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-300"
          >
            Play again
          </button>
          <button
            onClick={() => setPhase("setup")}
            className="flex-1 rounded-lg border border-amber-900/20 px-4 py-3 text-sm font-medium text-amber-950/80 transition hover:bg-orange-100/70"
          >
            Change settings
          </button>
        </div>
        <Link
          href={`/sets/${setId}`}
          className="mt-3 text-sm text-amber-950/50 underline hover:text-amber-950"
        >
          Back to set
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between text-sm text-amber-950/60">
        <span>Score: {score}</span>
        <span className="flex items-center gap-1">
          {Array.from({ length: STARTING_LIVES }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${i < lives ? "bg-rose-400" : "bg-amber-200/60"}`}
            />
          ))}
        </span>
      </div>

      <div className="relative h-[26rem] w-full overflow-hidden rounded-2xl border border-amber-900/10 bg-white shadow-sm">
        {words.map((word) => (
          <div
            key={word.id}
            onAnimationEnd={() => handleLand(word.id)}
            style={{ left: `${word.leftPct}%`, animationDuration: `${word.durationMs}ms` }}
            className="gravity-word absolute -translate-x-1/2 rounded-lg border border-amber-900/15 bg-orange-50 px-3 py-1.5 text-sm shadow-sm"
          >
            {word.prompt}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitGuess();
          }}
          placeholder="Type the matching answer…"
          className="w-full min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white px-3.5 py-2.5 text-base outline-none focus:border-rose-400"
        />
        <button
          onClick={submitGuess}
          className="shrink-0 rounded-lg bg-rose-400 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-300"
        >
          Enter
        </button>
      </div>
    </div>
  );
}
