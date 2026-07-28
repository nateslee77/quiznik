import { shuffle } from "@/lib/shuffle";
import type { Card } from "@/lib/types";

export type Direction = "term-to-definition" | "definition-to-term";
export type QuestionType = "multiple_choice" | "written";

export type QuizSettings = {
  questionType: QuestionType | "mixed";
  direction: Direction | "mixed";
  count: number;
  shuffle: boolean;
};

export type QuizQuestion = {
  card: Card;
  type: QuestionType;
  direction: Direction;
  prompt: string;
  answer: string;
  choices: string[]; // definitions/terms, shuffled, includes the correct one; [] for written
  correctIndex: number; // -1 for written
};

const MAX_CHOICES = 4;

function fieldsFor(direction: Direction): { promptField: "term" | "definition"; answerField: "term" | "definition" } {
  return direction === "term-to-definition"
    ? { promptField: "term", answerField: "definition" }
    : { promptField: "definition", answerField: "term" };
}

// Builds a single question for one card. Shared by Test mode's batch
// generation below and Learn mode, which builds one question at a time as
// cards move through its round queue.
export function buildQuestion(
  card: Card,
  allCards: Card[],
  direction: Direction,
  type: QuestionType,
): QuizQuestion {
  const { promptField, answerField } = fieldsFor(direction);
  const prompt = card[promptField];
  const answer = card[answerField];

  if (type === "written") {
    return { card, type, direction, prompt, answer, choices: [], correctIndex: -1 };
  }

  const distractorPool = shuffle(allCards.filter((c) => c.id !== card.id).map((c) => c[answerField]));
  const choices = shuffle([answer, ...distractorPool.slice(0, MAX_CHOICES - 1)]);
  return { card, type, direction, prompt, answer, choices, correctIndex: choices.indexOf(answer) };
}

function resolveDirection(setting: Direction | "mixed"): Direction {
  if (setting !== "mixed") return setting;
  return Math.random() < 0.5 ? "term-to-definition" : "definition-to-term";
}

function resolveType(setting: QuestionType | "mixed"): QuestionType {
  if (setting !== "mixed") return setting;
  return Math.random() < 0.5 ? "multiple_choice" : "written";
}

export function generateQuiz(cards: Card[], settings: QuizSettings): QuizQuestion[] {
  const pool = settings.shuffle ? shuffle(cards) : cards;
  const selected = pool.slice(0, Math.max(0, Math.min(settings.count, pool.length)));

  return selected.map((card) =>
    buildQuestion(card, cards, resolveDirection(settings.direction), resolveType(settings.questionType)),
  );
}
