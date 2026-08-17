import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudyStatus } from "@/lib/types";

export const LEARN_CORRECT_COINS = 1;
export const TEST_CORRECT_COINS = 1;

export const STAGE_BONUS: Record<StudyStatus, number> = {
  seen: 5,
  review: 10,
  mastered: 20,
};

export function testCompletionBonus(fractionCorrect: number): number {
  return Math.round(Math.max(0, Math.min(1, fractionCorrect)) * 50);
}

export const MATCH_PAIR_COINS = 1;

export function matchCompletionBonus(pairCount: number, mistakes: number): number {
  const accuracy = pairCount / (pairCount + mistakes);
  return Math.round(Math.max(0, Math.min(1, accuracy)) * 30);
}

export const GRAVITY_WORD_COINS = 1;

export function gravityCompletionBonus(score: number): number {
  return Math.min(40, score * 2);
}

// Ledger is small-scale for this app, so summing in JS is simpler and more
// predictable than relying on PostgREST aggregate query syntax.
export async function getCoinBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("coin_transactions")
    .select("amount")
    .eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + row.amount, 0);
}
