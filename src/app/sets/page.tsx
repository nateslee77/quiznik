import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { SetWithCardCount } from "@/lib/types";

export default async function SetsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sets")
    .select("*, cards(count)")
    .order("updated_at", { ascending: false });

  const sets: SetWithCardCount[] =
    data?.map((row) => ({
      ...row,
      card_count: row.cards?.[0]?.count ?? 0,
    })) ?? [];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My sets</h1>
        <Link
          href="/sets/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          + New set
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load your sets: {error.message}
        </p>
      ) : sets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
          <p className="text-neutral-500 dark:text-neutral-400">
            You don&apos;t have any sets yet.
          </p>
          <Link
            href="/sets/new"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Create your first set
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sets.map((set) => (
            <li key={set.id}>
              <Link
                href={`/sets/${set.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <h2 className="truncate font-medium">{set.title}</h2>
                {set.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
                    {set.description}
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
                  {set.card_count} {set.card_count === 1 ? "card" : "cards"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
