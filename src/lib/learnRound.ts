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

// Picks which cards make up one Learn round: not-yet-studied cards plus
// cards still in the seen/review stages, each pool capped by the round
// settings, optionally topped up with mastered cards as a refresher.
//
// The review pool is priority-filled by due date rather than picked purely
// at random: cards actually due (due_at <= now) come first, soonest/most-
// overdue first, so a card missed last session — or one whose interval has
// simply elapsed — resurfaces ahead of ones that aren't due yet. If there
// aren't enough due cards to fill maxReview, the round tops up with
// not-yet-due cards in soonest-due-first order, so this never shortens a
// round below what today's pure-random pick would produce.
export function buildRound(
  cards: Card[],
  progressByCardId: Record<string, ProgressSnapshot>,
  settings: RoundSettings,
  now: Date = new Date(),
): { queueCardIds: string[]; cardStates: Record<string, RoundCardState> } {
  const newCards = cards.filter((c) => !progressByCardId[c.id]);
  const learningCards = cards.filter((c) => {
    const row = progressByCardId[c.id];
    if (!row) return false;
    if (row.status === "mastered") return settings.includeMastered;
    return true; // seen and review cards are always eligible
  });

  // Parsed to epoch ms rather than compared as raw strings: due_at values
  // come from Postgres via PostgREST, whose timestamptz serialization
  // doesn't necessarily match JS's `Date#toISOString()` format byte-for-
  // byte (offset notation, fractional-second digit count), so lexicographic
  // string comparison isn't reliable even though both are valid UTC ISO8601.
  const nowMs = now.getTime();
  const dueAtMs = (cardId: string) => new Date(progressByCardId[cardId].due_at).getTime();
  const due = learningCards.filter((c) => dueAtMs(c.id) <= nowMs);
  const notYetDue = learningCards.filter((c) => dueAtMs(c.id) > nowMs);
  const sortByDueAsc = (list: Card[]) => shuffle(list).sort((a, b) => dueAtMs(a.id) - dueAtMs(b.id));
  const reviewPool = [...sortByDueAsc(due), ...sortByDueAsc(notYetDue)].slice(0, settings.maxReview);

  const roundCards = shuffle([...shuffle(newCards).slice(0, settings.maxNew), ...reviewPool]);

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
