import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LearnRunner } from "@/components/LearnRunner";
import { Breadcrumb } from "@/components/Breadcrumb";
import type { Card } from "@/lib/types";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: set } = await supabase
    .from("sets")
    .select("id, title, folder_id")
    .eq("id", id)
    .single();
  if (!set) notFound();

  const [cardsRes, foldersRes] = await Promise.all([
    supabase.from("cards").select("*").eq("set_id", id).order("position", { ascending: true }),
    supabase.from("folders").select("id, parent_id, name"),
  ]);

  const cardList: Card[] = cardsRes.data ?? [];
  const folders = foldersRes.data ?? [];

  if (cardList.length < 2) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-amber-950/50">
          Add at least 2 cards to this set to use Learn mode.
        </p>
        <Link href={`/sets/${id}`} className="mt-4 text-sm font-medium underline">
          Back to set
        </Link>
      </main>
    );
  }

  const { data: progressRows } = await supabase
    .from("study_progress")
    .select("card_id, phase, status, correct_streak, due_at")
    .eq("set_id", id);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
      <Breadcrumb
        folders={folders}
        folderId={set.folder_id}
        deckLabel={set.title}
        deckHref={`/sets/${id}`}
        trailingLabel="Learn"
      />
      <LearnRunner setId={id} cards={cardList} progressRows={progressRows ?? []} />
    </main>
  );
}
