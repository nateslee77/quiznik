"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Direction } from "@/lib/generateQuiz";
import { matchQuality } from "@/lib/fuzzyMatch";
import { shuffle } from "@/lib/shuffle";
import { HAPPY_REACTION_GIFS, SAD_REACTION_GIFS } from "@/lib/reactionGifs";
import { MASCOT_SKINS } from "@/lib/mascotSkins";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useMascot } from "@/components/mascot/MascotContext";
import { useCoins } from "@/components/coins/CoinsContext";
import { GRAVITY_WORD_COINS, gravityCompletionBonus } from "@/lib/coins";
import { awardGameCoins } from "@/app/sets/actions";
import { GearIcon } from "@/components/icons";
import type { Card } from "@/lib/types";

type Phase = "setup" | "playing" | "gameover";
type QuestionMode = "written" | "multiple_choice";
type AnswerField = "term" | "definition";
type FallingWord = {
  id: string;
  cardId: string;
  prompt: string;
  answer: string;
  answerField: AnswerField;
  durationMs: number;
  spawnedAt: number;
  leftPct: number;
  shape: 0 | 1 | 2;
};
type Floater = { id: string; src: string; topPct: number; durationMs: number };

const STARTING_LIVES = 3;
const MIN_SPAWN_MS = 1400;
const MAX_SPAWN_MS = 2800;
// Roughly double the original fall window — more time to answer each one.
const MIN_FALL_MS = 6000;
const MAX_FALL_MS = 14000;
const FLOATER_INTERVAL_MS = 5000;
const FLOATER_GIFS = [
  ...HAPPY_REACTION_GIFS,
  ...SAD_REACTION_GIFS,
  ...MASCOT_SKINS.map((s) => s.gif),
];

const DIRECTION_OPTIONS: { value: Direction | "mixed"; label: string }[] = [
  { value: "term-to-definition", label: "Term → Def" },
  { value: "definition-to-term", label: "Def → Term" },
  { value: "mixed", label: "Mixed" },
];

const QUESTION_TYPE_OPTIONS: { value: QuestionMode; label: string }[] = [
  { value: "written", label: "Type the answer" },
  { value: "multiple_choice", label: "Multiple choice" },
];

function wordTextFor(
  card: Card,
  direction: Direction | "mixed",
): { prompt: string; answer: string; answerField: AnswerField } {
  const resolved: Direction =
    direction === "mixed" ? (Math.random() < 0.5 ? "term-to-definition" : "definition-to-term") : direction;
  return resolved === "term-to-definition"
    ? { prompt: card.term, answer: card.definition, answerField: "definition" }
    : { prompt: card.definition, answer: card.term, answerField: "term" };
}

export function GravityGame({ setId, cards }: { setId: string; cards: Card[] }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [direction, setDirection] = useState<Direction | "mixed">("term-to-definition");
  const [questionType, setQuestionType] = useState<QuestionMode>("written");

  const [words, setWords] = useState<FallingWord[]>([]);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [input, setInput] = useState("");
  // Sampled periodically (not a real animation loop — the actual fall
  // motion stays purely CSS-driven) just to know which asteroid is
  // currently most urgent, for highlighting and for picking MC's target.
  const [now, setNow] = useState(0);

  const scoreRef = useRef(0);
  const nextSpawnAtRef = useRef(0);
  const nextFloaterAtRef = useRef(0);
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

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(id);
  }, [phase]);

  function spawnWord() {
    setWords((prev) => {
      const fallingCardIds = new Set(prev.map((w) => w.cardId));
      const pool = cards.filter((c) => !fallingCardIds.has(c.id));
      const source = pool.length > 0 ? pool : cards;
      const card = source[Math.floor(Math.random() * source.length)];
      const { prompt, answer, answerField } = wordTextFor(card, direction);
      const durationMs = Math.max(MIN_FALL_MS, MAX_FALL_MS - scoreRef.current * 200);
      const word: FallingWord = {
        id: crypto.randomUUID(),
        cardId: card.id,
        prompt,
        answer,
        answerField,
        durationMs,
        spawnedAt: Date.now(),
        leftPct: 8 + Math.random() * 74,
        shape: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      };
      return [...prev, word];
    });
  }

  function spawnFloater() {
    setFloaters((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        src: FLOATER_GIFS[Math.floor(Math.random() * FLOATER_GIFS.length)],
        topPct: 5 + Math.random() * 80,
        durationMs: 16000 + Math.random() * 10000,
      },
    ]);
  }

  // Short fixed-tick pollers rather than re-arming setInterval on every
  // state change — spawning stays on schedule even if `words`/`floaters`
  // change frequently right before a spawn was due.
  useEffect(() => {
    if (phase !== "playing") return;
    nextSpawnAtRef.current = Date.now() + 400;
    nextFloaterAtRef.current = Date.now() + 1500;
    const tick = setInterval(() => {
      const t = Date.now();
      if (t >= nextSpawnAtRef.current) {
        spawnWord();
        const spawnIntervalMs = Math.max(MIN_SPAWN_MS, MAX_SPAWN_MS - scoreRef.current * 80);
        nextSpawnAtRef.current = t + spawnIntervalMs;
      }
      if (t >= nextFloaterAtRef.current) {
        spawnFloater();
        nextFloaterAtRef.current = t + FLOATER_INTERVAL_MS;
      }
    }, 250);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // The most-urgent (closest to landing) falling word — highlighted in both
  // modes, and MC's answer target.
  const activeWordId = useMemo(() => {
    if (words.length === 0) return null;
    let bestId = words[0].id;
    let bestProgress = -Infinity;
    for (const w of words) {
      const progress = (now - w.spawnedAt) / w.durationMs;
      if (progress > bestProgress) {
        bestProgress = progress;
        bestId = w.id;
      }
    }
    return bestId;
  }, [words, now]);

  const activeChoices = useMemo(() => {
    if (questionType !== "multiple_choice") return null;
    const activeWord = words.find((w) => w.id === activeWordId);
    if (!activeWord) return null;
    const distractorPool = shuffle(
      cards.filter((c) => c.id !== activeWord.cardId).map((c) => c[activeWord.answerField]),
    ).slice(0, 3);
    return shuffle([activeWord.answer, ...distractorPool]);
  }, [questionType, words, activeWordId, cards]);

  function handleLand(wordId: string) {
    setWords((prev) => prev.filter((w) => w.id !== wordId));
    setLives((l) => Math.max(0, l - 1));
  }

  function destroyWord(wordId: string) {
    setWords((prev) => prev.filter((w) => w.id !== wordId));
    setScore((s) => s + 1);
  }

  function submitGuess() {
    const typed = input.trim();
    if (!typed) return;
    const nowMs = Date.now();
    let bestId: string | null = null;
    let bestProgress = -1;
    for (const w of words) {
      if (matchQuality(typed, w.answer) === "wrong") continue;
      const progress = (nowMs - w.spawnedAt) / w.durationMs;
      if (progress > bestProgress) {
        bestProgress = progress;
        bestId = w.id;
      }
    }
    if (bestId) destroyWord(bestId);
    setInput("");
  }

  function chooseMc(choice: string) {
    const activeWord = words.find((w) => w.id === activeWordId);
    if (!activeWord) return;
    if (choice === activeWord.answer) destroyWord(activeWord.id);
  }

  function startGame() {
    setWords([]);
    setFloaters([]);
    setScore(0);
    setLives(STARTING_LIVES);
    setInput("");
    setNow(Date.now());
    setPhase("playing");
    if (questionType === "written") requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (phase === "setup") {
    return (
      <div className="rounded-2xl border border-amber-900/10 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <GearIcon className="h-5 w-5 text-amber-950/60" />
          <h2 className="text-lg font-medium">Gravity settings</h2>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-950/60">Answer with</label>
            <SegmentedControl options={QUESTION_TYPE_OPTIONS} value={questionType} onChange={setQuestionType} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-950/60">Direction</label>
            <SegmentedControl options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
          </div>
        </div>

        <p className="mt-4 text-xs text-amber-950/50">
          Destroy each asteroid before it reaches the bottom. You have {STARTING_LIVES} lives — it
          speeds up the longer you last.
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
        <p className="text-sm text-amber-950/50">Asteroids destroyed</p>
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

      <div className="gravity-space relative h-[26rem] w-full overflow-hidden rounded-2xl border border-amber-900/10 shadow-sm">
        {floaters.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.id}
            src={f.src}
            alt=""
            onAnimationEnd={() => setFloaters((prev) => prev.filter((x) => x.id !== f.id))}
            style={{ top: `${f.topPct}%`, animationDuration: `${f.durationMs}ms` }}
            className="gravity-floater h-10 w-10 object-contain"
          />
        ))}
        {words.map((word) => {
          const isActive = word.id === activeWordId;
          return (
            <div
              key={word.id}
              onAnimationEnd={() => handleLand(word.id)}
              style={{ left: `${word.leftPct}%`, animationDuration: `${word.durationMs}ms` }}
              className={`gravity-word gravity-asteroid gravity-asteroid-${word.shape} absolute z-0 flex max-w-[9rem] -translate-x-1/2 items-center justify-center px-3 py-2.5 text-center text-xs font-medium transition-shadow sm:text-sm ${
                isActive ? "z-10 shadow-[0_0_0_3px_rgba(251,191,36,0.9),0_0_18px_rgba(251,191,36,0.7)]" : ""
              }`}
            >
              {word.prompt}
            </div>
          );
        })}
      </div>

      {questionType === "multiple_choice" ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(activeChoices ?? []).map((choice, i) => (
            <button
              key={i}
              onClick={() => chooseMc(choice)}
              className="rounded-lg border border-amber-900/20 bg-white px-4 py-2.5 text-left text-sm transition hover:border-rose-300 hover:bg-orange-50"
            >
              {choice}
            </button>
          ))}
        </div>
      ) : (
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
      )}
    </div>
  );
}
