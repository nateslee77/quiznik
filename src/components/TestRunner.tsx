"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { generateQuiz, type QuizQuestion, type QuizSettings, type Direction, type QuestionType } from "@/lib/generateQuiz";
import { isCloseEnough } from "@/lib/fuzzyMatch";
import { playCorrectChime, playWrongChime } from "@/lib/chime";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useMascot } from "@/components/mascot/MascotContext";
import { useCoins } from "@/components/coins/CoinsContext";
import { TEST_CORRECT_COINS, testCompletionBonus } from "@/lib/coins";
import { awardTestCoins, logStudyEvent } from "@/app/sets/actions";
import { GearIcon } from "@/components/icons";
import { cardImageUrl } from "@/lib/supabase/storage";
import { FormattedText } from "@/components/FormattedText";
import type { Card } from "@/lib/types";

type Answered = { question: QuizQuestion; correct: boolean };
type Phase = "setup" | "running";

const QUESTION_TYPE_OPTIONS: { value: QuestionType | "mixed"; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "written", label: "Written" },
  { value: "mixed", label: "Mixed" },
];

const DIRECTION_OPTIONS: { value: Direction | "mixed"; label: string }[] = [
  { value: "term-to-definition", label: "Term → Def" },
  { value: "definition-to-term", label: "Def → Term" },
  { value: "mixed", label: "Mixed" },
];

export function TestRunner({ setId, cards }: { setId: string; cards: Card[] }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [questionType, setQuestionType] = useState<QuestionType | "mixed">("multiple_choice");
  const [direction, setDirection] = useState<Direction | "mixed">("term-to-definition");
  const [count, setCount] = useState(cards.length);
  const [shuffleOn, setShuffleOn] = useState(true);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [writtenInput, setWrittenInput] = useState("");
  const [writtenChecked, setWrittenChecked] = useState(false);
  const [writtenCorrect, setWrittenCorrect] = useState(false);
  const [answers, setAnswers] = useState<Answered[]>([]);

  // `customCards`, when given, restricts the quiz to that subset (used by
  // "Retry missed questions") while still drawing MC distractors from the
  // full deck via generateQuiz's separate distractorPool param.
  function startTest(customCards?: Card[]) {
    const sourceCards = customCards ?? cards;
    const settings: QuizSettings = {
      questionType,
      direction,
      count: customCards ? sourceCards.length : count,
      shuffle: shuffleOn,
    };
    setQuestions(generateQuiz(sourceCards, settings, cards));
    setIndex(0);
    setAnswers([]);
    setSelected(null);
    setWrittenInput("");
    setWrittenChecked(false);
    setPhase("running");
  }

  const question = questions[index];
  const done = phase === "running" && index >= questions.length;

  const { setState: setMascot } = useMascot();
  const { addCoins } = useCoins();
  const correctCount = answers.filter((a) => a.correct).length;
  const scoredWell = questions.length > 0 && correctCount / questions.length >= 0.6;
  useEffect(() => {
    if (phase === "setup") setMascot("idle");
    else if (done) setMascot(scoredWell ? "celebrate" : "wrong");
    else setMascot("testing");
    return () => setMascot("idle");
  }, [phase, done, scoredWell, setMascot]);

  // Fires exactly once per completed attempt (done flips false->true once
  // per startTest() call) — optimistic coin add plus the persisted award,
  // fired in the background so results render instantly.
  useEffect(() => {
    if (!done || questions.length === 0) return;
    const coins = correctCount * TEST_CORRECT_COINS + testCompletionBonus(correctCount / questions.length);
    addCoins(coins);
    void awardTestCoins(setId, correctCount, questions.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function chooseMc(choiceIndex: number) {
    if (selected !== null) return;
    setSelected(choiceIndex);
    const correct = choiceIndex === question.correctIndex;
    setMascot(correct ? "correct" : "wrong");
    if (correct) playCorrectChime();
    else playWrongChime();
    void logStudyEvent(setId, question.card.id, "test", correct);
    setAnswers((prev) => [...prev, { question, correct }]);
  }

  function checkWritten() {
    if (writtenChecked) return;
    const correct = isCloseEnough(writtenInput, question.answer);
    setWrittenChecked(true);
    setWrittenCorrect(correct);
    setMascot(correct ? "correct" : "wrong");
    if (correct) playCorrectChime();
    else playWrongChime();
    void logStudyEvent(setId, question.card.id, "test", correct);
    setAnswers((prev) => [...prev, { question, correct }]);
  }

  function nextQuestion() {
    setSelected(null);
    setWrittenInput("");
    setWrittenChecked(false);
    setMascot("testing");
    setIndex((i) => i + 1);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "running" || done || !question) return;
      if (question.type !== "multiple_choice" || selected !== null) return;
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx === -1 || idx >= question.choices.length) return;
      chooseMc(idx);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, done, question, selected]);

  // Single source of truth for what Enter does, so "check" and "advance"
  // can never both fire off the same keypress: on a written question that
  // hasn't been checked yet, Enter checks it and stops there — a
  // *separate* later Enter press is what advances.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.repeat || phase !== "running" || done || !question) return;

      if (question.type === "written") {
        e.preventDefault();
        if (!writtenChecked) checkWritten();
        else nextQuestion();
        return;
      }

      if (selected !== null) {
        e.preventDefault();
        nextQuestion();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, done, question, selected, writtenChecked, writtenInput]);

  if (phase === "setup") {
    return (
      <div className="rounded-2xl border border-amber-900/10 bg-surface p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <GearIcon className="h-5 w-5 text-amber-950/60" />
          <h2 className="text-lg font-medium">Test settings</h2>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-950/60">
              Question type
            </label>
            <SegmentedControl options={QUESTION_TYPE_OPTIONS} value={questionType} onChange={setQuestionType} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-amber-950/60">
              Direction
            </label>
            <SegmentedControl options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="test-count" className="text-sm font-medium text-amber-950/60">
              Number of questions
            </label>
            <input
              id="test-count"
              type="number"
              min={1}
              max={cards.length}
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(cards.length, Number(e.target.value) || 1)))
              }
              className="w-20 rounded-lg border border-amber-900/20 bg-surface px-3 py-1.5 text-sm outline-none focus:border-rose-400"
            />
          </div>

          <label className="flex items-center justify-between text-sm font-medium text-amber-950/60">
            Shuffle question order
            <input
              type="checkbox"
              checked={shuffleOn}
              onChange={(e) => setShuffleOn(e.target.checked)}
              className="h-4 w-4 accent-rose-400"
            />
          </label>
        </div>

        <button
          onClick={() => startTest()}
          className="mt-6 w-full rounded-lg bg-rose-400 px-4 py-2.5 text-sm font-medium text-rose-contrast transition hover:bg-rose-300"
        >
          Start test
        </button>
      </div>
    );
  }

  if (done) {
    const correctCount = answers.filter((a) => a.correct).length;
    const missed = answers.filter((a) => !a.correct);
    const missedCards = [...new Map(missed.map((a) => [a.question.card.id, a.question.card])).values()];
    const pct = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="flex flex-1 flex-col items-center py-8 text-center">
        <p className="text-sm text-amber-950/50">Your score</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">{pct}%</p>
        <p className="mt-2 text-sm text-amber-950/50">
          {correctCount} of {questions.length} correct
        </p>

        {missed.length > 0 ? (
          <div className="mt-8 w-full max-w-md text-left">
            <h2 className="mb-3 text-sm font-medium text-amber-950/50">
              Review missed cards
            </h2>
            <div className="flex flex-col gap-2">
              {missed.map(({ question: q }) => (
                <div
                  key={q.card.id}
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
                >
                  <div className="font-medium">
                    <FormattedText text={q.prompt} />
                  </div>
                  <div className="mt-0.5 text-amber-950/60">
                    <FormattedText text={q.answer} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {missedCards.length > 0 ? (
          <button
            onClick={() => startTest(missedCards)}
            className="mt-6 w-full max-w-md rounded-lg border border-red-300 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Retry just the {missedCards.length} missed card{missedCards.length === 1 ? "" : "s"}
          </button>
        ) : null}

        <div className="mt-3 flex w-full max-w-md gap-3">
          <button
            onClick={() => startTest()}
            className="flex-1 rounded-lg bg-rose-400 px-4 py-3 text-sm font-medium text-rose-contrast transition hover:bg-rose-300"
          >
            Retake (same settings)
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
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-amber-200/60">
        <div
          className="h-full rounded-full bg-rose-400 transition-all"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>
      <p className="mb-2 text-sm text-amber-950/50">
        Question {index + 1} of {questions.length}
      </p>

      <div className="rounded-2xl border border-amber-900/10 bg-surface p-6 shadow-sm">
        {cardImageUrl(question.card.image_path) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cardImageUrl(question.card.image_path)!}
            alt=""
            className="mb-4 max-h-48 max-w-full rounded-xl object-contain"
          />
        ) : null}
        <div className="mb-6 text-xl font-medium sm:text-2xl">
          <FormattedText text={question.prompt} />
        </div>

        {question.type === "multiple_choice" ? (
          <>
            <div className="flex flex-col gap-2">
              {question.choices.map((choice, i) => {
                const isSelected = selected === i;
                const isCorrectChoice = i === question.correctIndex;
                const showState = selected !== null;

                let stateClasses =
                  "border-amber-900/20 hover:bg-orange-100/70";
                if (showState && isCorrectChoice) {
                  stateClasses =
                    "border-emerald-500 bg-emerald-50 text-emerald-900";
                } else if (showState && isSelected && !isCorrectChoice) {
                  stateClasses = "border-red-500 bg-red-50 text-red-900";
                }

                return (
                  <button
                    key={i}
                    onClick={() => chooseMc(i)}
                    disabled={selected !== null}
                    className={`rounded-lg border px-4 py-3 text-left text-sm transition disabled:cursor-default ${stateClasses}`}
                  >
                    <FormattedText text={choice} copyable={false} />
                  </button>
                );
              })}
            </div>

            {selected !== null ? (
              <button
                onClick={nextQuestion}
                className="mt-6 w-full rounded-lg bg-rose-400 px-4 py-3 text-sm font-medium text-rose-contrast transition hover:bg-rose-300"
              >
                {index + 1 === questions.length ? "See results" : "Next question →"}
              </button>
            ) : null}
          </>
        ) : !writtenChecked ? (
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              value={writtenInput}
              onChange={(e) => setWrittenInput(e.target.value)}
              placeholder="Type your answer…"
              className="w-full rounded-lg border border-amber-900/20 bg-surface px-3.5 py-2.5 text-base outline-none focus:border-rose-400"
            />
            <button
              onClick={checkWritten}
              className="rounded-lg bg-rose-400 px-4 py-3 text-sm font-medium text-rose-contrast transition hover:bg-rose-300"
            >
              Check answer
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div
              className={`rounded-lg border p-3 text-sm ${
                writtenCorrect
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : "border-red-500 bg-red-50 text-red-900"
              }`}
            >
              {writtenCorrect ? "Correct!" : (
                <>
                  Not quite. Correct answer:{" "}
                  <span className="font-medium">
                    <FormattedText text={question.answer} />
                  </span>
                </>
              )}
            </div>
            <button
              onClick={nextQuestion}
              className="rounded-lg bg-rose-400 px-4 py-3 text-sm font-medium text-rose-contrast transition hover:bg-rose-300"
            >
              {index + 1 === questions.length ? "See results" : "Next question →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
