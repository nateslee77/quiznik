import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyResult, DEFAULT_PROGRESS_STATE } from "@/lib/studyProgress";
import { LEARN_CORRECT_COINS, STAGE_BONUS } from "@/lib/coins";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> },
) {
  const { id: setId, cardId } = await params;

  const body = await request.json().catch(() => null);
  if (typeof body?.correct !== "boolean") {
    return NextResponse.json({ error: "Body must include { correct: boolean }." }, { status: 400 });
  }
  const correct: boolean = body.correct;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: card } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("set_id", setId)
    .single();
  if (!card) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("study_progress")
    .select("phase, status, correct_streak, ease_factor, interval_days, due_at")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  const nextState = applyResult(existing ?? DEFAULT_PROGRESS_STATE, correct);

  const { data: updated, error } = await supabase
    .from("study_progress")
    .upsert(
      {
        user_id: user.id,
        card_id: cardId,
        set_id: setId,
        ...nextState,
        last_reviewed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,card_id" },
    )
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Couldn't save progress." }, { status: 500 });
  }

  // Coin awards. Fire-and-forget from the caller's perspective (the client
  // doesn't wait on this), but do it inline here so both inserts share the
  // same auth context. The per-card-per-stage unique index makes repeated
  // stage-bonus attempts (e.g. after Reset Progress) harmless no-ops.
  if (correct) {
    await supabase.from("coin_transactions").insert({
      user_id: user.id,
      amount: LEARN_CORRECT_COINS,
      reason: "learn_correct",
      card_id: cardId,
      set_id: setId,
    });
  }
  const stageReason = `learn_stage_${nextState.status}`;
  const { data: stageBonusRows } = await supabase
    .from("coin_transactions")
    .upsert(
      {
        user_id: user.id,
        amount: STAGE_BONUS[nextState.status as keyof typeof STAGE_BONUS],
        reason: stageReason,
        card_id: cardId,
        set_id: setId,
        dedupe_key: `${user.id}:${cardId}:${stageReason}`,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    )
    .select();
  // ignoreDuplicates means a skipped (already-awarded) row comes back
  // empty — this tells the client whether it's safe to add the stage
  // bonus to the displayed coin count without double-crediting it.
  const stageBonusAwarded = (stageBonusRows?.length ?? 0) > 0;

  return NextResponse.json({ ...updated, stageBonusAwarded });
}
