"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { buildQuestion, type Direction } from "@/lib/generateQuiz";
import { matchQuality } from "@/lib/fuzzyMatch";
import { buildRound, type ProgressSnapshot, type RoundCardState } from "@/lib/learnRound";
import { resetStudyProgress } from "@/app/sets/actions";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useMascot } from "@/components/mascot/MascotContext";
import { useCoins } from "@/components/coins/CoinsContext";
import { LEARN_CORRECT_COINS, STAGE_BONUS } from "@/lib/coins";
import { GearIcon } from "@/components/icons";
import { cardImageUrl } from "@/lib/supabase/storage";
import { STAGE_COLORS, STAGE_LABELS, type Stage } from "@/lib/studyStage";
import type { Card } from "@/lib/types";

type ProgressRow = {
  card_id: string;
  phase: string;
  status: string;
  correct_streak: number;
  due_at: string;
};

type Phase = "setup" | "running";

const REQUEUE_OFFSET = 3;
const DEFAULT_MAX_NEW = 10;
const DEFAULT_MAX_REVIEW = 20;
const STAGE_ORDER: Stage[] = ["new", "seen", "review", "mastered"];

const DIRECTION_OPTIONS: { value: Direction | "mixed"; label: string }[] = [
  { value: "term-to-definition", label: "Term → Def" },
  { value: "definition-to-term", label: "Def → Term" },
  { value: "mixed", label: "Mixed" },
];

const ROUND_STORAGE_PREFIX = "quiznik-learn-round-";

type StoredRound = {
  phase: Phase;
  queue: string[];
  roundSize: number;
  cardStates: Record<string, RoundCardState>;
  doneCardIds: string[];
};

// Resumes an in-progress round left off from a previous visit (leaving the
// page, refreshing, or the tab just closing mid-round shouldn't lose your
// place). Only the round's structure is restored — not an answer that was
// mid-flight — so a refresh lands back on the current card fresh rather
// than replaying a half-submitted guess.
function loadStoredRound(setId: string, cards: Card[]): StoredRound | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ROUND_STORAGE_PREFIX + setId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRound;
    if (parsed.phase !== "running" || !Array.isArray(parsed.queue)) return null;
    // Defensive: the deck may have been edited since — drop any card ids
    // that no longer exist rather than trusting stale data blindly.
    const validIds = new Set(cards.map((c) => c.id));
    const queue = parsed.queue.filter((id) => validIds.has(id));
    if (queue.length === 0) return null;
    return { ...parsed, queue };
  } catch {
    return null;
  }
}

function toSnapshotMap(rows: ProgressRow[]): Record<string, ProgressSnapshot> {
  const map: Record<string, ProgressSnapshot> = {};
  for (const row of rows) {
    map[row.card_id] = {
      phase: row.phase as ProgressSnapshot["phase"],
      status: row.status as ProgressSnapshot["status"],
      correct_streak: row.correct_streak,
      due_at: row.due_at,
    };
  }
  return map;
}

function StageTile({ stage, count }: { stage: Stage; count: number }) {
  const colors = STAGE_COLORS[stage];
  return (
    <div className={`rounded-xl border p-2.5 text-center ${colors.border} ${colors.bg}`}>
      <p className={`text-lg font-semibold ${colors.text}`}>{count}</p>
      <p className="text-[11px] text-amber-950/50">{STAGE_LABELS[stage]}</p>
    </div>
  );
}

export function LearnRunner({
  setId,
  cards,
  progressRows,
}: {
  setId: string;
  cards: Card[];
  progressRows: ProgressRow[];
}) {
  const [storedRound] = useState(() => loadStoredRound(setId, cards));
  const [phase, setPhase] = useState<Phase>(storedRound ? "running" : "setup");
  const [maxNew, setMaxNew] = useState(DEFAULT_MAX_NEW);
  const [maxReview, setMaxReview] = useState(DEFAULT_MAX_REVIEW);
  const [direction, setDirection] = useState<Direction | "mixed">("definition-to-term");
  const [includeMastered, setIncludeMastered] = useState(false);
  const [emptyRoundNotice, setEmptyRoundNotice] = useState(false);
  const [resetPending, startResetTransition] = useTransition();

  const [progressByCardId, setProgressByCardId] = useState(() => toSnapshotMap(progressRows));
  const [queue, setQueue] = useState<string[]>(() => storedRound?.queue ?? []);
  const [roundSize, setRoundSize] = useState(() => storedRound?.roundSize ?? 0);
  const [cardStates, setCardStates] = useState<Record<string, RoundCardState>>(
    () => storedRound?.cardStates ?? {},
  );
  const [doneCardIds, setDoneCardIds] = useState<Set<string>>(() => new Set(storedRound?.doneCardIds ?? []));

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answerWasCorrect, setAnswerWasCorrect] = useState<boolean | null>(null);
  const [writtenInput, setWrittenInput] = useState("");
  const [writtenChecked, setWrittenChecked] = useState(false);
  // Set only when a typed answer is close-but-not-exact — holds off grading
  // until the user confirms whether they meant the correct term.
  const [pendingConfirm, setPendingConfirm] = useState<{ typed: string; correct: string } | null>(null);

  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const currentCardId = queue[0] as string | undefined;
  const currentCard = currentCardId ? cardsById.get(currentCardId) : undefined;

  const { setState: setMascot } = useMascot();
  const { addCoins } = useCoins();
  const view = phase === "setup" ? "setup" : !currentCardId ? "complete" : "question";
  useEffect(() => {
    if (view === "setup") setMascot("idle");
    else if (view === "complete") setMascot("celebrate");
    else setMascot("testing");
    return () => setMascot("idle");
  }, [view, setMascot]);

  // Persist the round's structure (not any answer mid-flight) so leaving
  // the page — navigating away, refreshing, closing the tab — and coming
  // back resumes at the same spot instead of losing the round entirely.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (phase !== "running" || queue.length === 0) {
        localStorage.removeItem(ROUND_STORAGE_PREFIX + setId);
        return;
      }
      const stored: StoredRound = { phase, queue, roundSize, cardStates, doneCardIds: [...doneCardIds] };
      localStorage.setItem(ROUND_STORAGE_PREFIX + setId, JSON.stringify(stored));
    } catch {
      // storage unavailable — round just won't persist across visits
    }
  }, [setId, phase, queue, roundSize, cardStates, doneCardIds]);

  // Deliberately keyed only on currentCardId: the question's presentation
  // must stay frozen for as long as this card is on screen, even though
  // submitResult() updates this same card's phase/streak in the background
  // the instant it's answered (that update should only affect its NEXT
  // appearance, not swap the UI mid-feedback for the current one).
  const activeQuestion = useMemo(() => {
    if (!currentCard || !currentCardId) return null;
    const state = cardStates[currentCardId];
    const questionType = (state?.phase ?? "multiple_choice") === "multiple_choice" ? "multiple_choice" : "written";
    // Written answers are always "type the term" — typing a full definition
    // back is slow and unreliable to grade, so this ignores the round's
    // configured direction for written questions specifically.
    const resolvedDirection: Direction =
      questionType === "written" ? "definition-to-term" : state?.direction ?? "term-to-definition";
    return buildQuestion(currentCard, cards, resolvedDirection, questionType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardId]);

  function startRound() {
    const { queueCardIds, cardStates: nextCardStates } = buildRound(cards, progressByCardId, {
      maxNew,
      maxReview,
      direction,
      includeMastered,
    });
    if (queueCardIds.length === 0) {
      setEmptyRoundNotice(true);
      return;
    }
    setEmptyRoundNotice(false);
    setQueue(queueCardIds);
    setRoundSize(queueCardIds.length);
    setCardStates(nextCardStates);
    setDoneCardIds(new Set());
    setSelectedIndex(null);
    setAnswerWasCorrect(null);
    setWrittenInput("");
    setWrittenChecked(false);
    setPendingConfirm(null);
    setPhase("running");
  }

  function doReset() {
    if (!confirm("Reset Learn progress for this set? Every card will start over as new.")) return;
    startResetTransition(async () => {
      await resetStudyProgress(setId);
      setProgressByCardId({});
    });
  }

  // Fire-and-forget from every caller: the UI advances immediately on
  // click, this just persists in the background and reconciles local
  // state (and any stage-bonus coins) whenever it resolves.
  async function submitResult(cardId: string, correct: boolean) {
    const res = await fetch(`/api/sets/${setId}/study-progress/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correct }),
    });
    const updated = await res.json();
    setProgressByCardId((prev) => ({
      ...prev,
      [cardId]: {
        phase: updated.phase,
        status: updated.status,
        correct_streak: updated.correct_streak,
        due_at: updated.due_at,
      },
    }));
    setCardStates((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], phase: updated.phase, correctStreak: updated.correct_streak },
    }));
    if (updated.stageBonusAwarded) {
      addCoins(STAGE_BONUS[updated.status as keyof typeof STAGE_BONUS]);
    }
  }

  function advance() {
    if (!currentCardId || answerWasCorrect === null) return;
    const wasCorrect = answerWasCorrect;
    const cardId = currentCardId;
    setDoneCardIds((prev) => new Set(prev).add(cardId));
    setQueue((prev) => {
      const rest = prev.slice(1);
      if (!wasCorrect) {
        const next = [...rest];
        next.splice(Math.min(REQUEUE_OFFSET, next.length), 0, cardId);
        return next;
      }
      return rest;
    });
    setSelectedIndex(null);
    setAnswerWasCorrect(null);
    setWrittenInput("");
    setWrittenChecked(false);
    setPendingConfirm(null);
    setMascot("testing");
  }

  function chooseMc(choiceIndex: number) {
    if (selectedIndex !== null || !activeQuestion || !currentCardId) return;
    setSelectedIndex(choiceIndex);
    const correct = choiceIndex === activeQuestion.correctIndex;
    setAnswerWasCorrect(correct);
    setMascot(correct ? "correct" : "wrong");
    if (correct) addCoins(LEARN_CORRECT_COINS);
    void submitResult(currentCardId, correct);
  }

  function gradeWritten(correct: boolean) {
    if (!currentCardId) return;
    setPendingConfirm(null);
    setWrittenChecked(true);
    setAnswerWasCorrect(correct);
    setMascot(correct ? "correct" : "wrong");
    if (correct) addCoins(LEARN_CORRECT_COINS);
    void submitResult(currentCardId, correct);
  }

  function checkWritten() {
    if (!activeQuestion || !currentCardId || writtenChecked || pendingConfirm) return;
    const quality = matchQuality(writtenInput, activeQuestion.answer);
    if (quality === "close") {
      setPendingConfirm({ typed: writtenInput.trim(), correct: activeQuestion.answer });
      return;
    }
    gradeWritten(quality === "exact");
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (view !== "question" || !activeQuestion) return;
      if (activeQuestion.type !== "multiple_choice" || selectedIndex !== null) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx === -1 || idx >= activeQuestion.choices.length) return;
      chooseMc(idx);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeQuestion, selectedIndex]);

  // Single source of truth for what Enter does, so "check" and "advance"
  // can never both fire off the same keypress: on a written question that
  // hasn't been checked yet, Enter checks it and stops there — a
  // *separate* later Enter press is what advances. (Two independent
  // listeners racing on the same event was the previous, buggier approach.)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.repeat || view !== "question" || !activeQuestion) return;
      if (pendingConfirm) return; // needs an explicit Yes/No, not Enter

      if (activeQuestion.type === "written") {
        e.preventDefault();
        if (!writtenChecked) checkWritten();
        else advance();
        return;
      }

      if (selectedIndex !== null) {
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeQuestion, selectedIndex, writtenChecked, pendingConfirm, writtenInput]);

  const stageCounts: Record<Stage, number> = {
    new: cards.length - Object.keys(progressByCardId).length,
    seen: 0,
    review: 0,
    mastered: 0,
  };
  for (const snapshot of Object.values(progressByCardId)) {
    stageCounts[snapshot.status] += 1;
  }

  if (phase === "setup") {
    return (
      <div className="rounded-2xl border border-amber-900/10 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <GearIcon className="h-5 w-5 text-amber-950/60" />
          <h2 className="text-lg font-medium">Learn settings</h2>
        </div>

        <div className="mb-6 grid grid-cols-4 gap-2">
          {STAGE_ORDER.map((stage) => (
            <StageTile key={stage} stage={stage} count={stageCounts[stage]} />
          ))}
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <label htmlFor="max-new" className="text-sm font-medium text-amber-950/60">
              New cards per round
            </label>
            <input
              id="max-new"
              type="number"
              min={1}
              value={maxNew}
              onChange={(e) => setMaxNew(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-lg border border-amber-900/20 bg-white px-3 py-1.5 text-sm outline-none focus:border-rose-400"
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="max-review" className="text-sm font-medium text-amber-950/60">
              Learning cards per round
            </label>
            <input
              id="max-review"
              type="number"
              min={1}
              value={maxReview}
              onChange={(e) => setMaxReview(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-lg border border-amber-900/20 bg-white px-3 py-1.5 text-sm outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-950/60">Direction</label>
            <SegmentedControl options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
          </div>

          <label className="flex items-center justify-between text-sm font-medium text-amber-950/60">
            Include mastered cards
            <input
              type="checkbox"
              checked={includeMastered}
              onChange={(e) => setIncludeMastered(e.target.checked)}
              className="h-4 w-4 accent-rose-400"
            />
          </label>
        </div>

        {emptyRoundNotice ? (
          <p className="mt-4 text-sm text-amber-950/60">
            Nothing to learn right now &mdash; everything is mastered. Turn on
            &ldquo;include mastered cards&rdquo; for a refresher round.
          </p>
        ) : null}

        <button
          onClick={startRound}
          className="mt-6 w-full rounded-xl bg-rose-400 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-300"
        >
          Start learning
        </button>

        <button
          onClick={doReset}
          disabled={resetPending}
          className="mt-3 w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
        >
          {resetPending ? "Resetting…" : "Reset progress for this set"}
        </button>
      </div>
    );
  }

  if (!currentCardId || !currentCard) {
    return (
      <div className="flex flex-1 flex-col items-center py-8 text-center">
        <p className="text-sm text-amber-950/60">Round complete</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">Nice work!</p>

        <div className="mt-8 grid w-full max-w-md grid-cols-4 gap-2">
          {STAGE_ORDER.map((stage) => (
            <StageTile key={stage} stage={stage} count={stageCounts[stage]} />
          ))}
        </div>

        <div className="mt-8 flex w-full max-w-md gap-3">
          <button
            onClick={startRound}
            className="flex-1 rounded-xl bg-rose-400 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-300"
          >
            Keep learning
          </button>
          <button
            onClick={() => setPhase("setup")}
            className="flex-1 rounded-xl border border-amber-900/20 px-4 py-3 text-sm font-medium text-amber-950/80 transition hover:bg-orange-100/70"
          >
            Change settings
          </button>
        </div>
        <Link
          href={`/sets/${setId}`}
          className="mt-3 text-sm text-amber-950/60 underline hover:text-amber-950"
        >
          Back to set
        </Link>
      </div>
    );
  }

  if (!activeQuestion) return null;

  const progress = doneCardIds.size / Math.max(roundSize, 1);
  const currentStage: Stage = progressByCardId[currentCardId] === undefined ? "new" : progressByCardId[currentCardId].status;
  const stageColors = STAGE_COLORS[currentStage];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-amber-200/60">
        <div
          className="h-full rounded-full bg-rose-400 transition-all"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <p className="mb-2 flex items-center gap-2 text-sm text-amber-950/60">
        {activeQuestion.type === "multiple_choice" ? "Multiple choice" : "Written answer"} &middot;{" "}
        {queue.length} card{queue.length === 1 ? "" : "s"} left
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${stageColors.border} ${stageColors.bg} ${stageColors.text}`}
        >
          {STAGE_LABELS[currentStage]}
        </span>
      </p>

      <div className="rounded-2xl border border-amber-900/10 bg-white p-6 shadow-sm sm:p-8">
        {cardImageUrl(activeQuestion.card.image_path) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cardImageUrl(activeQuestion.card.image_path)!}
            alt=""
            className="mb-4 max-h-48 max-w-full rounded-xl object-contain"
          />
        ) : null}
        <h2 className="mb-6 text-xl font-medium sm:text-2xl">{activeQuestion.prompt}</h2>

        {activeQuestion.type === "multiple_choice" ? (
          <>
            <div className="flex flex-col gap-2">
              {activeQuestion.choices.map((choice, i) => {
                const isSelected = selectedIndex === i;
                const isCorrectChoice = i === activeQuestion.correctIndex;
                const showState = selectedIndex !== null;

                let stateClasses = "border-amber-900/20 hover:bg-orange-100/70";
                if (showState && isCorrectChoice) {
                  stateClasses = "border-emerald-500 bg-emerald-50 text-emerald-700";
                } else if (showState && isSelected && !isCorrectChoice) {
                  stateClasses = "border-red-500 bg-red-50 text-red-600";
                }

                return (
                  <button
                    key={i}
                    onClick={() => chooseMc(i)}
                    disabled={selectedIndex !== null}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-default ${stateClasses}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {selectedIndex !== null ? (
              <button
                onClick={advance}
                className="mt-6 w-full rounded-xl bg-rose-400 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-300"
              >
                Next →
              </button>
            ) : null}
          </>
        ) : pendingConfirm ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              You wrote <span className="font-medium">“{pendingConfirm.typed}”</span> — did you mean{" "}
              <span className="font-medium">“{pendingConfirm.correct}”</span>?
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => gradeWritten(true)}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-400"
              >
                Yes, that&rsquo;s right
              </button>
              <button
                onClick={() => gradeWritten(false)}
                className="flex-1 rounded-xl border border-red-300 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                No, mark wrong
              </button>
            </div>
          </div>
        ) : !writtenChecked ? (
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              value={writtenInput}
              onChange={(e) => setWrittenInput(e.target.value)}
              placeholder="Type your answer…"
              className="w-full rounded-xl border border-amber-900/20 bg-white px-3.5 py-2.5 text-base outline-none transition focus:border-rose-400"
            />
            <button
              onClick={checkWritten}
              className="rounded-xl bg-rose-400 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-300"
            >
              Check answer
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {answerWasCorrect ? (
              <div className="rounded-xl border border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-700">
                Correct! <span className="text-amber-950/60">({activeQuestion.answer})</span>
              </div>
            ) : (
              <div className="rounded-xl border border-red-500 bg-red-50 p-3 text-sm text-red-600">
                Not quite. Correct answer:{" "}
                <span className="font-medium">{activeQuestion.answer}</span>
              </div>
            )}
            <button
              onClick={advance}
              className="rounded-xl bg-rose-400 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-300"
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
