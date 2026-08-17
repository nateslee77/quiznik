"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { shuffle } from "@/lib/shuffle";
import { useMascot } from "@/components/mascot/MascotContext";
import { useCoins } from "@/components/coins/CoinsContext";
import { MATCH_PAIR_COINS, matchCompletionBonus } from "@/lib/coins";
import { awardGameCoins } from "@/app/sets/actions";
import { GearIcon } from "@/components/icons";
import type { Card } from "@/lib/types";

type Phase = "setup" | "playing" | "complete";
type Tile = { key: string; cardId: string; text: string };

function formatElapsed(ms: number): string {
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
}

function buildTiles(picked: Card[]): Tile[] {
  const tiles: Tile[] = picked.flatMap((card) => [
    { key: `${card.id}-term`, cardId: card.id, text: card.term },
    { key: `${card.id}-definition`, cardId: card.id, text: card.definition },
  ]);
  return shuffle(tiles);
}

export function MatchGame({ setId, cards }: { setId: string; cards: Card[] }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [pairCount, setPairCount] = useState(Math.min(8, cards.length));

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [matchedCardIds, setMatchedCardIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<string[] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef(0);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setState: setMascot } = useMascot();
  const { addCoins } = useCoins();
  const activePairCount = tiles.length / 2;

  useEffect(() => {
    if (phase === "setup") setMascot("idle");
    else if (phase === "complete") setMascot(mistakes <= activePairCount / 2 ? "celebrate" : "wrong");
    else setMascot("testing");
    return () => setMascot("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 100);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    };
  }, []);

  // Coins fire exactly once per completed game (phase flips setup/playing ->
  // "complete" once per startGame() call), same pattern as TestRunner.
  useEffect(() => {
    if (phase !== "complete" || activePairCount === 0) return;
    const amount = activePairCount * MATCH_PAIR_COINS + matchCompletionBonus(activePairCount, mistakes);
    addCoins(amount);
    void awardGameCoins(setId, amount, "match_complete");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startGame() {
    const picked = shuffle(cards).slice(0, Math.max(3, Math.min(pairCount, cards.length)));
    setTiles(buildTiles(picked));
    setMatchedCardIds(new Set());
    setSelected([]);
    setWrongPair(null);
    setMistakes(0);
    setElapsedMs(0);
    startTimeRef.current = Date.now();
    setPhase("playing");
  }

  function clickTile(tile: Tile) {
    if (wrongPair || matchedCardIds.has(tile.cardId) || selected.includes(tile.key)) return;

    if (selected.length === 0) {
      setSelected([tile.key]);
      return;
    }

    const first = tiles.find((t) => t.key === selected[0]);
    if (first && first.cardId === tile.cardId) {
      const nextMatched = new Set(matchedCardIds).add(tile.cardId);
      setMatchedCardIds(nextMatched);
      setSelected([]);
      if (nextMatched.size === activePairCount) setPhase("complete");
      return;
    }

    setMistakes((m) => m + 1);
    setWrongPair([selected[0], tile.key]);
    wrongTimerRef.current = setTimeout(() => {
      setWrongPair(null);
      setSelected([]);
    }, 400);
  }

  if (phase === "setup") {
    return (
      <div className="rounded-2xl border border-amber-900/10 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <GearIcon className="h-5 w-5 text-amber-950/60" />
          <h2 className="text-lg font-medium">Match settings</h2>
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="pair-count" className="text-sm font-medium text-amber-950/60">
            Pairs to match
          </label>
          <input
            id="pair-count"
            type="number"
            min={3}
            max={cards.length}
            value={pairCount}
            onChange={(e) =>
              setPairCount(Math.max(3, Math.min(cards.length, Number(e.target.value) || 3)))
            }
            className="w-20 rounded-lg border border-amber-900/20 bg-white px-3 py-1.5 text-sm outline-none focus:border-rose-400"
          />
        </div>

        <button
          onClick={startGame}
          className="mt-6 w-full rounded-lg bg-rose-400 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-300"
        >
          Start
        </button>
      </div>
    );
  }

  if (phase === "complete") {
    const amount = activePairCount * MATCH_PAIR_COINS + matchCompletionBonus(activePairCount, mistakes);
    return (
      <div className="flex flex-1 flex-col items-center py-8 text-center">
        <p className="text-sm text-amber-950/50">Matched in</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">{formatElapsed(elapsedMs)}</p>
        <p className="mt-2 text-sm text-amber-950/50">
          {mistakes} mistake{mistakes === 1 ? "" : "s"} &middot; +{amount} coins
        </p>

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
      <div className="mb-4 flex items-center justify-between text-sm text-amber-950/60">
        <span>{formatElapsed(elapsedMs)}</span>
        <span>
          {matchedCardIds.size} / {activePairCount} pairs &middot; {mistakes} mistake
          {mistakes === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => {
          const isMatched = matchedCardIds.has(tile.cardId);
          const isSelected = selected.includes(tile.key);
          const isWrong = wrongPair?.includes(tile.key) ?? false;

          let stateClasses = "border-amber-900/15 bg-white hover:border-rose-300";
          if (isWrong) stateClasses = "border-red-500 bg-red-50 text-red-600";
          else if (isSelected) stateClasses = "border-rose-400 bg-rose-50";

          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => clickTile(tile)}
              disabled={isMatched}
              className={`line-clamp-4 min-h-20 rounded-xl border p-3 text-left text-sm transition ${stateClasses} ${
                isMatched ? "invisible" : ""
              }`}
            >
              {tile.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
