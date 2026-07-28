import type { StudyPhase, StudyStatus } from "@/lib/types";

export type ProgressState = {
  phase: StudyPhase;
  status: StudyStatus;
  correct_streak: number;
  ease_factor: number;
  interval_days: number;
};

export const DEFAULT_PROGRESS_STATE: ProgressState = {
  phase: "multiple_choice",
  status: "seen",
  correct_streak: 0,
  ease_factor: 2.5,
  interval_days: 0,
};

const MC_GRADUATION_STREAK = 2;

// Quizlet-style staging: a card is "seen" while it's being drilled as
// multiple choice, moves to "review" once it graduates to written recall,
// and becomes "mastered" on a correct written answer. Any miss resets the
// streak (and knocks a mastered card back to review). ease_factor and
// interval_days are kept in the row for a future spaced-repetition
// upgrade but no longer drive the staging.
export function applyResult(current: ProgressState, correct: boolean): ProgressState {
  let phase: StudyPhase = current.phase;
  let status: StudyStatus = current.status;
  let streak = current.correct_streak;

  if (!correct) {
    streak = 0;
    if (status === "mastered") {
      status = "review";
      phase = "written";
    }
    return { ...current, phase, status, correct_streak: streak };
  }

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

  return { ...current, phase, status, correct_streak: streak };
}
