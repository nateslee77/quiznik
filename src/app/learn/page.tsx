import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Jumps into the deck with the most cards still being learned. A true
// cross-deck review session is a later enhancement.
export default async function LearnRedirectPage() {
  const supabase = await createClient();

  const { data: progress } = await supabase
    .from("study_progress")
    .select("set_id")
    .in("status", ["seen", "review"]);

  const dueBySet = new Map<string, number>();
  for (const row of progress ?? []) {
    dueBySet.set(row.set_id, (dueBySet.get(row.set_id) ?? 0) + 1);
  }

  let bestSetId: string | null = null;
  let bestCount = 0;
  for (const [setId, count] of dueBySet) {
    if (count > bestCount) {
      bestSetId = setId;
      bestCount = count;
    }
  }

  if (bestSetId) redirect(`/sets/${bestSetId}/learn`);

  // Nothing due: fall back to the most recently updated deck's learn page,
  // or the library if there are no decks at all.
  const { data: recent } = await supabase
    .from("sets")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  redirect(recent ? `/sets/${recent.id}/learn` : "/sets");
}
