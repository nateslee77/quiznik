import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudyDeck } from "@/components/StudyDeck";
import type { Card } from "@/lib/types";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: set } = await supabase.from("sets").select("id, title").eq("id", id).single();
  if (!set) notFound();

  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .eq("set_id", id)
    .order("position", { ascending: true });

  const cardList: Card[] = cards ?? [];

  if (cardList.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-neutral-500 dark:text-neutral-400">This set has no cards yet.</p>
        <Link href={`/sets/${id}`} className="mt-4 text-sm font-medium underline">
          Back to set
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/sets/${id}`}
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          ← {set.title}
        </Link>
        <Link
          href={`/sets/${id}/test`}
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          Switch to Test
        </Link>
      </div>
      <StudyDeck cards={cardList} />
    </main>
  );
}
