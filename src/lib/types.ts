export type FlashcardSet = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Card = {
  id: string;
  set_id: string;
  term: string;
  definition: string;
  position: number;
  created_at: string;
};

export type SetWithCardCount = FlashcardSet & { card_count: number };
