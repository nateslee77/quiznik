"use client";

import { useState } from "react";
import Link from "next/link";
import { generateQuiz, type QuizQuestion } from "@/lib/generateQuiz";
import type { Card } from "@/lib/types";

type Answered = { question: QuizQuestion; selectedIndex: number; correct: boolean };

export function TestRunner({ setId, cards }: { setId: string; cards: Card[] }) {
  const [questions, setQuestions] = useState(() => generateQuiz(cards));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answered[]>([]);

  const question = questions[index];
  const done = index >= questions.length;

  function choose(choiceIndex: number) {
    if (selected !== null) return;
    setSelected(choiceIndex);
    setAnswers((prev) => [
      ...prev,
      {
        question,
        selectedIndex: choiceIndex,
        correct: choiceIndex === question.correctIndex,
      },
    ]);
  }

  function nextQuestion() {
    setSelected(null);
    setIndex((i) => i + 1);
  }

  function retake() {
    setQuestions(generateQuiz(cards));
    setIndex(0);
    setSelected(null);
    setAnswers([]);
  }

  if (done) {
    const correctCount = answers.filter((a) => a.correct).length;
    const missed = answers.filter((a) => !a.correct);
    const pct = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="flex flex-1 flex-col items-center py-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Your score</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">{pct}%</p>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {correctCount} of {questions.length} correct
        </p>

        {missed.length > 0 ? (
          <div className="mt-8 w-full max-w-md text-left">
            <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Review missed cards
            </h2>
            <div className="flex flex-col gap-2">
              {missed.map(({ question: q }) => (
                <div
                  key={q.card.id}
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40"
                >
                  <p className="font-medium">{q.card.term}</p>
                  <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">{q.card.definition}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex w-full max-w-md gap-3">
          <button
            onClick={retake}
            className="flex-1 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Retake test
          </button>
          <Link
            href={`/sets/${setId}`}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-center text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            Back to set
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>
      <p className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
        Question {index + 1} of {questions.length}
      </p>
      <h2 className="mb-6 text-xl font-medium sm:text-2xl">{question.card.term}</h2>

      <div className="flex flex-col gap-2">
        {question.choices.map((choice, i) => {
          const isSelected = selected === i;
          const isCorrectChoice = i === question.correctIndex;
          const showState = selected !== null;

          let stateClasses =
            "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900";
          if (showState && isCorrectChoice) {
            stateClasses =
              "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
          } else if (showState && isSelected && !isCorrectChoice) {
            stateClasses = "border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-300";
          }

          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={selected !== null}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition disabled:cursor-default ${stateClasses}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {selected !== null ? (
        <button
          onClick={nextQuestion}
          className="mt-6 w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {index + 1 === questions.length ? "See results" : "Next question →"}
        </button>
      ) : null}
    </div>
  );
}
