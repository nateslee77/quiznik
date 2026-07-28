import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetHeader } from "@/components/SetHeader";
import { CardList } from "@/components/CardList";
import type { Card } from "@/lib/types";

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: set } = await supabase.from("sets").select("*").eq("id", id).single();
  if (!set) notFound();

  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .eq("set_id", id)
    .order("position", { ascending: true });

  const cardList: Card[] = cards ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <SetHeader set={set} />

      {cardList.length > 0 ? (
        <div className="mb-6 flex gap-3">
          <Link
            href={`/sets/${id}/study`}
            className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Study
          </Link>
          <Link
            href={`/sets/${id}/test`}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            Test
          </Link>
          <Link
            href={`/sets/${id}/learn`}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            Learn
          </Link>
        </div>
      ) : null}

      <CardList setId={id} cards={cardList} />
    </main>
  );
}
