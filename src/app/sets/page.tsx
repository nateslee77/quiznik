import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FolderControls } from "@/components/FolderControls";
import { DeckIcon, FolderIcon, PlusIcon, SearchIcon } from "@/components/icons";
import type { Folder, SetWithCardCount } from "@/lib/types";

function relativeEdited(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "edited today";
  if (days === 1) return "edited yesterday";
  if (days < 30) return `edited ${days}d ago`;
  return `edited ${Math.floor(days / 30)}mo ago`;
}

const FILTERS = ["all", "decks", "folders"] as const;
type Filter = (typeof FILTERS)[number];

// Every folder id inside the subtree rooted at folderId (inclusive).
function subtreeIds(folders: Folder[], folderId: string): Set<string> {
  const ids = new Set<string>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  return ids;
}

function breadcrumbs(folders: Folder[], folder: Folder): Folder[] {
  const chain: Folder[] = [folder];
  let current = folder;
  while (current.parent_id) {
    const parent = folders.find((f) => f.id === current.parent_id);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

function FolderRow({
  folder,
  subfolderCount,
  deckCount,
}: {
  folder: Folder;
  subfolderCount: number;
  deckCount: number;
}) {
  const parts = [
    subfolderCount > 0 ? `${subfolderCount} folder${subfolderCount === 1 ? "" : "s"}` : null,
    `${deckCount} deck${deckCount === 1 ? "" : "s"}`,
  ].filter(Boolean);

  return (
    <Link
      href={`/sets?folder=${folder.id}`}
      className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 transition hover:border-white/10 hover:bg-white/[0.05]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
        <FolderIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{folder.name}</span>
        <span className="block text-xs text-neutral-500">{parts.join(" · ")}</span>
      </span>
    </Link>
  );
}

function DeckRow({ set, due }: { set: SetWithCardCount; due: number }) {
  return (
    <Link
      href={`/sets/${set.id}`}
      className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 transition hover:border-white/10 hover:bg-white/[0.05]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
        <DeckIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{set.title}</span>
        <span className="block text-xs text-neutral-500">
          {set.card_count} card{set.card_count === 1 ? "" : "s"} · {relativeEdited(set.updated_at)}
        </span>
      </span>
      {due > 0 ? (
        <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
          {due}
        </span>
      ) : null}
    </Link>
  );
}

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

  const sets: SetWithCardCount[] =
    setsRes.data?.map((row) => ({ ...row, card_count: row.cards?.[0]?.count ?? 0 })) ?? [];
  const folders: Folder[] = foldersRes.data ?? [];

  const dueBySet = new Map<string, number>();
  for (const row of progressRes.data ?? []) {
    dueBySet.set(row.set_id, (dueBySet.get(row.set_id) ?? 0) + 1);
  }

  const deckCountInSubtree = (folderId: string) => {
    const ids = subtreeIds(folders, folderId);
    return sets.filter((s) => s.folder_id && ids.has(s.folder_id)).length;
  };

  const activeFolder = params.folder ? folders.find((f) => f.id === params.folder) : undefined;

  // ---- Folder view: breadcrumbs, controls, subfolders, decks ----
  if (activeFolder) {
    const crumbs = breadcrumbs(folders, activeFolder);
    const subfolders = folders.filter((f) => f.parent_id === activeFolder.id);
    const folderDecks = sets.filter((s) => s.folder_id === activeFolder.id);

    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm text-neutral-500">
          <Link href="/sets" className="hover:text-neutral-300">
            Library
          </Link>
          {crumbs.map((crumb) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <span>/</span>
              {crumb.id === activeFolder.id ? (
                <span className="text-neutral-300">{crumb.name}</span>
              ) : (
                <Link href={`/sets?folder=${crumb.id}`} className="hover:text-neutral-300">
                  {crumb.name}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{activeFolder.name}</h1>
          <FolderControls folder={activeFolder} />
        </div>

        <div className="flex flex-col gap-2">
          {subfolders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              subfolderCount={folders.filter((f) => f.parent_id === folder.id).length}
              deckCount={deckCountInSubtree(folder.id)}
            />
          ))}
          {folderDecks.map((set) => (
            <DeckRow key={set.id} set={set} due={dueBySet.get(set.id) ?? 0} />
          ))}
          {subfolders.length === 0 && folderDecks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-14 text-center">
              <p className="text-sm text-neutral-400">This folder is empty.</p>
              <p className="text-xs text-neutral-600">
                Add a subfolder above, or move a deck here from its edit panel.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ---- Root view: filter pills, root folders, decks ----
  const rootFolders = folders.filter((f) => !f.parent_id);
  const unfiledDecks = sets.filter((s) => !s.folder_id);
  const showFolders = filter === "all" || filter === "folders";
  const showDecks = filter === "all" || filter === "decks";
  const decksToShow = filter === "decks" ? sets : unfiledDecks;

  const pill = (value: Filter, label: string) => (
    <Link
      key={value}
      href={value === "all" ? "/sets" : `/sets?filter=${value}`}
      className={`border-b-2 px-1 pb-2 text-sm font-medium transition ${
        filter === value
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
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
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

      <div className="mb-5 flex items-center gap-5 border-b border-white/5">
        {pill("all", "All")}
        {pill("decks", "Decks")}
        {pill("folders", "Folders")}
      </div>

      <div className="flex flex-col gap-2">
        {showFolders
          ? rootFolders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                subfolderCount={folders.filter((f) => f.parent_id === folder.id).length}
                deckCount={deckCountInSubtree(folder.id)}
              />
            ))
          : null}

        {showDecks
          ? decksToShow.map((set) => (
              <DeckRow key={set.id} set={set} due={dueBySet.get(set.id) ?? 0} />
            ))
          : null}

        {(showFolders ? rootFolders.length : 0) + (showDecks ? decksToShow.length : 0) === 0 ? (
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
