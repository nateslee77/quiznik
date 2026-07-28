import { shuffle } from "@/lib/shuffle";
import type { Card } from "@/lib/types";

export type QuizQuestion = {
  card: Card;
  choices: string[]; // definitions, shuffled, includes the correct one
  correctIndex: number;
};

const MAX_CHOICES = 4;

// Multiple choice when there are enough other cards to draw distractors
// from; otherwise falls back to a plain typed-answer question (choices: []).
export function generateQuiz(cards: Card[]): QuizQuestion[] {
  const shuffledCards = shuffle(cards);

  return shuffledCards.map((card) => {
    const distractorPool = shuffle(
      cards.filter((c) => c.id !== card.id).map((c) => c.definition),
    );

    if (distractorPool.length === 0) {
      return { card, choices: [], correctIndex: -1 };
    }

    const distractors = distractorPool.slice(0, MAX_CHOICES - 1);
    const choices = shuffle([card.definition, ...distractors]);
    const correctIndex = choices.indexOf(card.definition);

    return { card, choices, correctIndex };
  });
}
