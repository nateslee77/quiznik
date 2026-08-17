import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TestRunner } from "@/components/TestRunner";
import { Breadcrumb } from "@/components/Breadcrumb";
import type { Card } from "@/lib/types";

export default async function TestPage({
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
          Add at least 2 cards to this set to take a test.
        </p>
        <Link href={`/sets/${id}`} className="mt-4 text-sm font-medium underline">
          Back to set
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
      <div className="mb-1 flex items-center justify-between">
        <Breadcrumb
          folders={folders}
          folderId={set.folder_id}
          deckLabel={set.title}
          deckHref={`/sets/${id}`}
          trailingLabel="Test"
        />
        <Link
          href={`/sets/${id}/study`}
          className="mb-3 shrink-0 text-sm font-medium text-amber-950/50 hover:text-amber-950"
        >
          Switch to Study
        </Link>
      </div>
      <TestRunner setId={id} cards={cardList} />
    </main>
  );
}
