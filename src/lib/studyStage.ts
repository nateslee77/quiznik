import type { StudyStatus } from "@/lib/types";

// "new" isn't a StudyStatus in the DB (no row = never studied) but is a
// real stage everywhere progress is displayed.
export type Stage = StudyStatus | "new";

export const STAGE_LABELS: Record<Stage, string> = {
  new: "Not studied",
  seen: "Seen",
  review: "Review",
  mastered: "Mastered",
};

export const STAGE_COLORS: Record<Stage, { border: string; bg: string; text: string; dot: string }> = {
  new: { border: "border-amber-900/10", bg: "bg-surface", text: "text-amber-950/70", dot: "bg-amber-900/20" },
  seen: { border: "border-amber-300", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  review: { border: "border-rose-300", bg: "bg-rose-100", text: "text-rose-600", dot: "bg-rose-400" },
  mastered: { border: "border-emerald-300", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
};
