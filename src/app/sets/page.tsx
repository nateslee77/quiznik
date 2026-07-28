import { createClient } from "@/lib/supabase/server";
import { LibraryBrowser, type LibraryDeck } from "@/components/LibraryBrowser";
import type { Folder } from "@/lib/types";

const FILTERS = ["all", "decks", "folders"] as const;
type Filter = (typeof FILTERS)[number];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; folder?: string }>;
}) {
  const params = await searchParams;
  const filter: Filter = FILTERS.includes(params.filter as Filter)
    ? (params.filter as Filter)
    : "all";

  const supabase = await createClient();
  const [setsRes, foldersRes, progressRes] = await Promise.all([
    supabase.from("sets").select("*, cards(count)").order("updated_at", { ascending: false }),
    supabase.from("folders").select("*").order("position").order("created_at"),
    supabase.from("study_progress").select("set_id, status").in("status", ["seen", "review"]),
  ]);

  const folders: Folder[] = foldersRes.data ?? [];

  const dueBySet = new Map<string, number>();
  for (const row of progressRes.data ?? []) {
    dueBySet.set(row.set_id, (dueBySet.get(row.set_id) ?? 0) + 1);
  }

  const decks: LibraryDeck[] =
    setsRes.data?.map((row) => ({
      id: row.id,
      title: row.title,
      folder_id: row.folder_id,
      card_count: row.cards?.[0]?.count ?? 0,
      updated_at: row.updated_at,
      due: dueBySet.get(row.id) ?? 0,
    })) ?? [];

  const activeFolderId =
    params.folder && folders.some((f) => f.id === params.folder) ? params.folder : null;

  return (
    <LibraryBrowser
      folders={folders}
      decks={decks}
      activeFolderId={activeFolderId}
      filter={filter}
    />
  );
}
