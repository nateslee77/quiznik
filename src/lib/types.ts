export type FlashcardSet = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Folder = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  position: number;
  created_at: string;
};

export type Card = {
  id: string;
  set_id: string;
  term: string;
  definition: string;
  position: number;
  image_path: string | null;
  distractors: string[] | null;
  created_at: string;
};

export type SetWithCardCount = FlashcardSet & { card_count: number };

export type StudyPhase = "multiple_choice" | "written";
export type StudyStatus = "seen" | "review" | "mastered";

export type StudyProgress = {
  id: string;
  user_id: string;
  card_id: string;
  set_id: string;
  phase: StudyPhase;
  status: StudyStatus;
  correct_streak: number;
  ease_factor: number;
  interval_days: number;
  due_at: string;
  last_reviewed_at: string | null;
  created_at: string;
};
