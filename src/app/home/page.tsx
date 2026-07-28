import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MascotPlaceholder } from "@/components/landing/MascotPlaceholder";
import { BoltIcon, DeckIcon, PlusIcon } from "@/components/icons";
import type { SetWithCardCount } from "@/lib/types";

function isDueNow(dueAt: string): boolean {
  return new Date(dueAt).getTime() <= Date.now();
}

export default async function HomePage() {
  const supabase = await createClient();

  const [setsRes, progressRes] = await Promise.all([
    supabase.from("sets").select("*, cards(count)").order("updated_at", { ascending: false }),
    supabase.from("study_progress").select("set_id, status, due_at").eq("status", "reviewing"),
  ]);

  const sets: SetWithCardCount[] =
    setsRes.data?.map((row) => ({
      ...row,
      card_count: row.cards?.[0]?.count ?? 0,
    })) ?? [];

  const dueBySet = new Map<string, number>();
  for (const row of progressRes.data ?? []) {
    if (isDueNow(row.due_at)) {
      dueBySet.set(row.set_id, (dueBySet.get(row.set_id) ?? 0) + 1);
    }
  }
  const totalDue = [...dueBySet.values()].reduce((a, b) => a + b, 0);
  const recent = sets.slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
      <div className="flex items-center gap-4">
        <MascotPlaceholder variant="happy" className="h-14 w-14 shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-0.5 text-sm text-neutral-400">
            {totalDue > 0
              ? `${totalDue} card${totalDue === 1 ? "" : "s"} ready for review.`
              : "You're all caught up. Nice."}
          </p>
        </div>
      </div>

      {totalDue > 0 ? (
        <Link
          href="/learn"
          className="mt-6 flex items-center gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 transition hover:bg-indigo-500/15"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
            <BoltIcon className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-medium">Start reviewing</span>
            <span className="block text-xs text-neutral-400">
              {totalDue} due card{totalDue === 1 ? "" : "s"} across your decks
            </span>
          </span>
          <span className="rounded-full bg-indigo-500 px-2.5 py-0.5 text-xs font-semibold text-white">
            {totalDue}
          </span>
        </Link>
      ) : null}

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-400">Continue studying</h2>
          <Link href="/sets" className="text-xs text-indigo-400 hover:text-indigo-300">
            View library →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-14 text-center">
            <p className="text-sm text-neutral-400">No decks yet — make your first one.</p>
            <Link
              href="/sets/new"
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
            >
              <PlusIcon className="h-4 w-4" />
              New deck
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((set) => {
              const due = dueBySet.get(set.id) ?? 0;
              return (
                <Link
                  key={set.id}
                  href={`/sets/${set.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-white/10 hover:bg-white/[0.05]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                    <DeckIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{set.title}</span>
                    <span className="block text-xs text-neutral-500">
                      {set.card_count} card{set.card_count === 1 ? "" : "s"}
                    </span>
                  </span>
                  {due > 0 ? (
                    <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
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
