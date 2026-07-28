import type { Grade, StudyPhase, StudyStatus } from "@/lib/types";

export type ProgressState = {
  phase: StudyPhase;
  status: StudyStatus;
  correct_streak: number;
  ease_factor: number;
  interval_days: number;
};

export const DEFAULT_PROGRESS_STATE: ProgressState = {
  phase: "multiple_choice",
  status: "reviewing",
  correct_streak: 0,
  ease_factor: 2.5,
  interval_days: 0,
};

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const MASTERY_INTERVAL_DAYS = 21;
const MC_GRADUATION_STREAK = 2;

// A simplified SM-2: real SM-2 tracks a 0-5 quality score and repetition
// count separately. Here the four Anki-style buttons collapse onto a single
// streak counter that drives both the multiple-choice -> written graduation
// and the review interval growth.
export function applyGrade(current: ProgressState, grade: Grade): ProgressState {
  let phase: StudyPhase = current.phase;
  let streak = current.correct_streak;
  let ease = current.ease_factor;
  let interval = current.interval_days;

  switch (grade) {
    case "again":
      streak = 0;
      ease = Math.max(MIN_EASE, ease - 0.2);
      interval = 0;
      break;
    case "hard":
      streak += 1;
      ease = Math.max(MIN_EASE, ease - 0.15);
      interval = Math.max(1, Math.round(interval * 1.2));
      break;
    case "good":
      streak += 1;
      interval = interval === 0 ? 1 : Math.round(interval * ease);
      break;
    case "easy":
      streak += 1;
      ease = Math.min(MAX_EASE, ease + 0.15);
      interval = Math.round((interval || 1) * ease * 1.3);
      break;
  }

  if (phase === "multiple_choice" && streak >= MC_GRADUATION_STREAK) {
    phase = "written";
  }

  const status: StudyStatus =
    grade !== "again" && interval >= MASTERY_INTERVAL_DAYS ? "mastered" : "reviewing";

  return { phase, status, correct_streak: streak, ease_factor: ease, interval_days: interval };
}

export function nextDueDate(intervalDays: number): string {
  const due = new Date();
  due.setDate(due.getDate() + Math.max(0, Math.round(intervalDays)));
  return due.toISOString();
}
