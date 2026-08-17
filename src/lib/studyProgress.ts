import type { StudyPhase, StudyStatus } from "@/lib/types";

export type ProgressState = {
  phase: StudyPhase;
  status: StudyStatus;
  correct_streak: number;
  ease_factor: number;
  interval_days: number;
  due_at: string;
};

export const DEFAULT_PROGRESS_STATE: ProgressState = {
  phase: "multiple_choice",
  status: "seen",
  correct_streak: 0,
  ease_factor: 2.5,
  interval_days: 0,
  // Never actually read: a first-time card is always MC-phase, and both
  // branches of applyResult() below overwrite due_at unconditionally.
  due_at: new Date(0).toISOString(),
};

const MC_GRADUATION_STREAK = 2;
const MIN_EASE_FACTOR = 1.3;
const EASE_PENALTY = 0.2;
const MAX_INTERVAL_DAYS = 30;
const FIRST_WRITTEN_INTERVAL_DAYS = 1;
const DAY_MS = 86_400_000;

// Quizlet-style staging: a card is "seen" while it's being drilled as
// multiple choice, moves to "review" once it graduates to written recall,
// and becomes "mastered" on a correct written answer. Any miss resets the
// streak (and knocks a mastered card back to review).
//
// Real spaced repetition rides alongside that staging via ease_factor /
// interval_days / due_at: a miss makes a card due again immediately and
// shrinks its future intervals (via the ease penalty); a correct *written*
// answer pushes its due date out, growing geometrically by ease_factor each
// time it succeeds again. Gated on `current.phase` (the phase *before* this
// answer) rather than the possibly-just-graduated `phase` below — otherwise
// the MC-graduation moment itself would start the spacing clock before the
// card has ever actually answered a written question.
export function applyResult(
  current: ProgressState,
  correct: boolean,
  now: Date = new Date(),
): ProgressState {
  let phase: StudyPhase = current.phase;
  let status: StudyStatus = current.status;
  let streak = current.correct_streak;
  let easeFactor = current.ease_factor;
  let intervalDays: number;

  if (!correct) {
    streak = 0;
    if (status === "mastered") {
      status = "review";
      phase = "written";
    }
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - EASE_PENALTY);
    intervalDays = 0;
  } else {
    streak += 1;

    if (phase === "multiple_choice") {
      if (streak >= MC_GRADUATION_STREAK) {
        phase = "written";
        status = "review";
      } else {
        status = "seen";
      }
    } else {
      status = "mastered";
    }

    intervalDays =
      current.phase === "written"
        ? current.interval_days > 0
          ? Math.min(MAX_INTERVAL_DAYS, Math.round(current.interval_days * easeFactor))
          : FIRST_WRITTEN_INTERVAL_DAYS
        : 0;
  }

  const dueAt = new Date(now.getTime() + intervalDays * DAY_MS).toISOString();

  return {
    ...current,
    phase,
    status,
    correct_streak: streak,
    ease_factor: easeFactor,
    interval_days: intervalDays,
    due_at: dueAt,
  };
}
