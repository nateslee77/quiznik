import { shuffle } from "@/lib/shuffle";
import type { Card, StudyPhase, StudyStatus } from "@/lib/types";
import type { Direction } from "@/lib/generateQuiz";

export type ProgressSnapshot = {
  phase: StudyPhase;
  status: StudyStatus;
  correct_streak: number;
};

export type RoundSettings = {
  maxNew: number;
  maxReview: number;
  direction: Direction | "mixed";
  includeMastered: boolean;
};

export type RoundCardState = { phase: StudyPhase; correctStreak: number; direction: Direction };

function resolveDirection(setting: Direction | "mixed"): Direction {
  if (setting !== "mixed") return setting;
  return Math.random() < 0.5 ? "term-to-definition" : "definition-to-term";
}

// Picks which cards make up one Learn round: not-yet-studied cards plus
// cards still in the seen/review stages, each pool capped by the round
// settings, optionally topped up with mastered cards as a refresher.
export function buildRound(
  cards: Card[],
  progressByCardId: Record<string, ProgressSnapshot>,
  settings: RoundSettings,
): { queueCardIds: string[]; cardStates: Record<string, RoundCardState> } {
  const newCards = cards.filter((c) => !progressByCardId[c.id]);
  const learningCards = cards.filter((c) => {
    const row = progressByCardId[c.id];
    if (!row) return false;
    if (row.status === "mastered") return settings.includeMastered;
    return true; // seen and review cards are always eligible
  });

  const roundCards = shuffle([
    ...shuffle(newCards).slice(0, settings.maxNew),
    ...shuffle(learningCards).slice(0, settings.maxReview),
  ]);

  const cardStates: Record<string, RoundCardState> = {};
  for (const card of roundCards) {
    const row = progressByCardId[card.id];
    cardStates[card.id] = {
      phase: row?.phase ?? "multiple_choice",
      correctStreak: row?.correct_streak ?? 0,
      direction: resolveDirection(settings.direction),
    };
  }

  return { queueCardIds: roundCards.map((c) => c.id), cardStates };
}
