import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MascotPlaceholder } from "@/components/landing/MascotPlaceholder";
import { CoinBalance } from "@/components/coins/CoinBalance";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { BoltIcon, DeckIcon, PlusIcon } from "@/components/icons";
import type { SetWithCardCount } from "@/lib/types";
import { lookbackCutoffIso, type StudyEvent } from "@/lib/activity";

// 53 weeks back covers the full "Yearly" heatmap view (a GitHub-style
// 53-column grid), which is the widest range any view needs.
const ACTIVITY_LOOKBACK_DAYS = 371;

export default async function HomePage() {
  const supabase = await createClient();

  const lookbackCutoff = lookbackCutoffIso(ACTIVITY_LOOKBACK_DAYS);

  const [setsRes, progressRes, eventsRes] = await Promise.all([
    supabase.from("sets").select("*, cards(count)").order("updated_at", { ascending: false }),
    supabase.from("study_progress").select("set_id, status").in("status", ["seen", "review"]),
    supabase
      .from("study_events")
      .select("created_at, correct, set_id, card_id")
      .gte("created_at", lookbackCutoff)
      .order("created_at", { ascending: false })
      .limit(20000),
  ]);

  const events: StudyEvent[] = eventsRes.data ?? [];

  const sets: SetWithCardCount[] =
    setsRes.data?.map((row) => ({
      ...row,
      card_count: row.cards?.[0]?.count ?? 0,
    })) ?? [];

  const dueBySet = new Map<string, number>();
  for (const row of progressRes.data ?? []) {
    dueBySet.set(row.set_id, (dueBySet.get(row.set_id) ?? 0) + 1);
  }
  const totalDue = [...dueBySet.values()].reduce((a, b) => a + b, 0);
  const recent = sets.slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
      <div className="flex items-center gap-4">
        <MascotPlaceholder variant="idle" className="h-14 w-14 shrink-0" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-0.5 text-sm text-amber-950/60">
            {totalDue > 0
              ? `${totalDue} card${totalDue === 1 ? "" : "s"} ready for review.`
              : "You're all caught up. Nice."}
          </p>
        </div>
        <CoinBalance />
      </div>

      <div className="mt-6">
        <ActivityHeatmap events={events} />
      </div>

      {totalDue > 0 ? (
        <Link
          href="/learn"
          className="mt-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-100 p-4 transition hover:bg-rose-100"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
            <BoltIcon className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-medium">Start reviewing</span>
            <span className="block text-xs text-amber-950/60">
              {totalDue} due card{totalDue === 1 ? "" : "s"} across your decks
            </span>
          </span>
          <span className="rounded-full bg-rose-400 px-2.5 py-0.5 text-xs font-semibold text-white">
            {totalDue}
          </span>
        </Link>
      ) : null}

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-amber-950/60">Continue studying</h2>
          <Link href="/sets" className="text-xs text-rose-500 hover:text-rose-400">
            View library →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-amber-900/15 py-14 text-center">
            <p className="text-sm text-amber-950/60">No decks yet — make your first one.</p>
            <Link
              href="/sets/new"
              className="flex items-center gap-2 rounded-xl bg-rose-400 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-300"
            >
              <PlusIcon className="h-4 w-4" />
              New deck
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((set) => {
              const due = dueBySet.get(set.id) ?? 0;
              return (
                <Link
                  key={set.id}
                  href={`/sets/${set.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-amber-900/10 bg-white p-4 transition hover:border-amber-900/15 hover:bg-orange-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
                    <DeckIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{set.title}</span>
                    <span className="block text-xs text-amber-950/50">
                      {set.card_count} card{set.card_count === 1 ? "" : "s"}
                    </span>
                  </span>
                  {due > 0 ? (
                    <span className="rounded-full bg-rose-400 px-2 py-0.5 text-xs font-semibold text-white">
                      {due}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
