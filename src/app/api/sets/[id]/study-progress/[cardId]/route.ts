import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyResult, DEFAULT_PROGRESS_STATE } from "@/lib/studyProgress";

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
    .select("phase, status, correct_streak, ease_factor, interval_days")
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
        due_at: new Date().toISOString(),
        last_reviewed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,card_id" },
    )
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Couldn't save progress." }, { status: 500 });
  }

  return NextResponse.json(updated);
}
