import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeckIcon, FolderIcon, PlusIcon, SearchIcon } from "@/components/icons";
import type { Folder, SetWithCardCount } from "@/lib/types";

function isDueNow(dueAt: string): boolean {
  return new Date(dueAt).getTime() <= Date.now();
}

function relativeEdited(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "edited today";
  if (days === 1) return "edited yesterday";
  if (days < 30) return `edited ${days}d ago`;
  return `edited ${Math.floor(days / 30)}mo ago`;
}

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
  const folderId = params.folder;

  const supabase = await createClient();
  const [setsRes, foldersRes, progressRes] = await Promise.all([
    supabase.from("sets").select("*, cards(count)").order("updated_at", { ascending: false }),
    supabase.from("folders").select("*").order("position").order("created_at"),
    supabase.from("study_progress").select("set_id, status, due_at").eq("status", "reviewing"),
  ]);

  const sets: SetWithCardCount[] =
    setsRes.data?.map((row) => ({ ...row, card_count: row.cards?.[0]?.count ?? 0 })) ?? [];
  const folders: Folder[] = foldersRes.data ?? [];

  const dueBySet = new Map<string, number>();
  for (const row of progressRes.data ?? []) {
    if (isDueNow(row.due_at)) dueBySet.set(row.set_id, (dueBySet.get(row.set_id) ?? 0) + 1);
  }

  const activeFolder = folderId ? folders.find((f) => f.id === folderId) : undefined;
  const visibleSets = activeFolder ? sets.filter((s) => s.folder_id === activeFolder.id) : sets;
  const showFolders = !activeFolder && (filter === "all" || filter === "folders");
  const showDecks = filter === "all" || filter === "decks" || Boolean(activeFolder);

  const pill = (value: Filter, label: string) => (
    <Link
      key={value}
      href={value === "all" ? "/sets" : `/sets?filter=${value}`}
      className={`border-b-2 px-1 pb-2 text-sm font-medium transition ${
        filter === value && !activeFolder
          ? "border-indigo-400 text-white"
          : "border-transparent text-neutral-500 hover:text-neutral-300"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {activeFolder ? activeFolder.name : "Library"}
        </h1>
        <Link
          href="/sets/new"
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          <PlusIcon className="h-4 w-4" />
          New deck
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-500">
        <SearchIcon className="h-4 w-4" />
        Search your library
        <span className="ml-auto rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-neutral-600">
          Soon
        </span>
      </div>

      {activeFolder ? (
        <Link href="/sets" className="mb-4 inline-block text-sm text-indigo-400 hover:text-indigo-300">
          ← All folders
        </Link>
      ) : (
        <div className="mb-5 flex items-center gap-5 border-b border-white/5">
          {pill("all", "All")}
          {pill("decks", "Decks")}
          {pill("folders", "Folders")}
          <span className="cursor-default border-b-2 border-transparent px-1 pb-2 text-sm font-medium text-neutral-700">
            Quizzes <span className="text-[10px] uppercase">soon</span>
          </span>
          <span className="cursor-default border-b-2 border-transparent px-1 pb-2 text-sm font-medium text-neutral-700">
            Notes <span className="text-[10px] uppercase">soon</span>
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {showFolders
          ? folders.map((folder) => {
              const count = sets.filter((s) => s.folder_id === folder.id).length;
              return (
                <Link
                  key={folder.id}
                  href={`/sets?folder=${folder.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 transition hover:border-white/10 hover:bg-white/[0.05]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                    <FolderIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{folder.name}</span>
                    <span className="block text-xs text-neutral-500">
                      {count} deck{count === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              );
            })
          : null}

        {showDecks
          ? visibleSets.map((set) => {
              const due = dueBySet.get(set.id) ?? 0;
              return (
                <Link
                  key={set.id}
                  href={`/sets/${set.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 transition hover:border-white/10 hover:bg-white/[0.05]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                    <DeckIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{set.title}</span>
                    <span className="block text-xs text-neutral-500">
                      {set.card_count} card{set.card_count === 1 ? "" : "s"} ·{" "}
                      {relativeEdited(set.updated_at)}
                    </span>
                  </span>
                  {due > 0 ? (
                    <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {due}
                    </span>
                  ) : null}
                </Link>
              );
            })
          : null}

        {(showDecks && visibleSets.length === 0 && (!showFolders || folders.length === 0)) ||
        (!showDecks && showFolders && folders.length === 0) ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-14 text-center">
            <p className="text-sm text-neutral-400">Nothing here yet.</p>
            <Link
              href="/sets/new"
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
            >
              <PlusIcon className="h-4 w-4" />
              Create a deck
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
