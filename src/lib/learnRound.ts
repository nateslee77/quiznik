import { shuffle } from "@/lib/shuffle";
import type { Card, StudyPhase, StudyStatus } from "@/lib/types";
import type { Direction } from "@/lib/generateQuiz";

export type ProgressSnapshot = {
  phase: StudyPhase;
  status: StudyStatus;
  correct_streak: number;
  due_at: string;
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

function isDueNow(dueAt: string): boolean {
  return new Date(dueAt).getTime() <= Date.now();
}

// Picks which cards make up one Learn round: new cards (never answered) and
// due-for-review cards, each capped by the round settings, optionally
// topped up with already-mastered cards as a refresher pool.
export function buildRound(
  cards: Card[],
  progressByCardId: Record<string, ProgressSnapshot>,
  settings: RoundSettings,
): { queueCardIds: string[]; cardStates: Record<string, RoundCardState> } {
  const newCards = cards.filter((c) => !progressByCardId[c.id]);
  const reviewCards = cards.filter((c) => {
    const row = progressByCardId[c.id];
    if (!row) return false;
    if (row.status === "mastered") return settings.includeMastered;
    return row.status === "reviewing" && isDueNow(row.due_at);
  });

  const roundCards = shuffle([
    ...shuffle(newCards).slice(0, settings.maxNew),
    ...shuffle(reviewCards).slice(0, settings.maxReview),
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
