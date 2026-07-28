"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createFolder, moveFolder, moveSetToFolder } from "@/app/sets/actions";
import { FolderControls } from "@/components/FolderControls";
import { DeckIcon, FolderIcon, PlusIcon, SearchIcon } from "@/components/icons";
import type { Folder } from "@/lib/types";

export type LibraryDeck = {
  id: string;
  title: string;
  folder_id: string | null;
  card_count: number;
  updated_at: string;
  due: number;
};

type Filter = "all" | "decks" | "folders";
type DragPayload = { kind: "deck" | "folder"; id: string };

const DRAG_MIME = "application/x-quiznik";

function relativeEdited(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "edited today";
  if (days === 1) return "edited yesterday";
  if (days < 30) return `edited ${days}d ago`;
  return `edited ${Math.floor(days / 30)}mo ago`;
}

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

export function LibraryBrowser({
  folders,
  decks,
  activeFolderId,
  filter,
}: {
  folders: Folder[];
  decks: LibraryDeck[];
  activeFolderId: string | null;
  filter: Filter;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dropTarget, setDropTarget] = useState<string | null>(null); // folder id or "root"
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");

  const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : undefined;

  // ---- drag and drop ----
  function startDrag(e: React.DragEvent, payload: DragPayload) {
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  function allowDrop(e: React.DragEvent, targetKey: string) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(targetKey);
  }

  function handleDrop(e: React.DragEvent, targetFolderId: string | null) {
    e.preventDefault();
    setDropTarget(null);
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    const payload: DragPayload = JSON.parse(raw);

    if (payload.kind === "folder") {
      if (payload.id === targetFolderId) return;
      // Client-side guard against dropping into own subtree (server re-checks).
      if (targetFolderId && subtreeIds(folders, payload.id).has(targetFolderId)) return;
      startTransition(async () => {
        await moveFolder(payload.id, targetFolderId);
        router.refresh();
      });
    } else {
      const deck = decks.find((d) => d.id === payload.id);
      if (deck && deck.folder_id === targetFolderId) return;
      startTransition(async () => {
        await moveSetToFolder(payload.id, targetFolderId);
        router.refresh();
      });
    }
  }

  function dropZoneClass(key: string) {
    return dropTarget === key ? "ring-2 ring-rose-400 ring-offset-2 ring-offset-[#fff7f0]" : "";
  }

  // ---- new folder ----
  function submitFolder() {
    if (!folderName.trim()) {
      setAddingFolder(false);
      return;
    }
    startTransition(async () => {
      await createFolder(folderName, activeFolderId);
      setFolderName("");
      setAddingFolder(false);
      router.refresh();
    });
  }

  // ---- rows ----
  const FolderRow = ({ folder }: { folder: Folder }) => {
    const subfolderCount = folders.filter((f) => f.parent_id === folder.id).length;
    const ids = subtreeIds(folders, folder.id);
    const deckCount = decks.filter((d) => d.folder_id && ids.has(d.folder_id)).length;
    const parts = [
      subfolderCount > 0 ? `${subfolderCount} folder${subfolderCount === 1 ? "" : "s"}` : null,
      `${deckCount} deck${deckCount === 1 ? "" : "s"}`,
    ].filter(Boolean);

    return (
      <Link
        href={`/sets?folder=${folder.id}`}
        draggable
        onDragStart={(e) => startDrag(e, { kind: "folder", id: folder.id })}
        onDragOver={(e) => allowDrop(e, folder.id)}
        onDragLeave={() => setDropTarget((t) => (t === folder.id ? null : t))}
        onDrop={(e) => handleDrop(e, folder.id)}
        className={`flex items-center gap-3 rounded-2xl border border-amber-900/10 bg-white p-3.5 transition hover:border-amber-900/15 hover:bg-orange-50 ${dropZoneClass(folder.id)}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/70 text-amber-700">
          <FolderIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{folder.name}</span>
          <span className="block text-xs text-amber-950/50">{parts.join(" · ")}</span>
        </span>
      </Link>
    );
  };

  const DeckRow = ({ deck }: { deck: LibraryDeck }) => (
    <Link
      href={`/sets/${deck.id}`}
      draggable
      onDragStart={(e) => startDrag(e, { kind: "deck", id: deck.id })}
      className="flex items-center gap-3 rounded-2xl border border-amber-900/10 bg-white p-3.5 transition hover:border-amber-900/15 hover:bg-orange-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
        <DeckIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{deck.title}</span>
        <span className="block text-xs text-amber-950/50">
          {deck.card_count} card{deck.card_count === 1 ? "" : "s"} · {relativeEdited(deck.updated_at)}
        </span>
      </span>
      {deck.due > 0 ? (
        <span className="rounded-full bg-rose-400 px-2 py-0.5 text-xs font-semibold text-white">
          {deck.due}
        </span>
      ) : null}
    </Link>
  );

  const newFolderControl = addingFolder ? (
    <input
      autoFocus
      value={folderName}
      onChange={(e) => setFolderName(e.target.value)}
      onBlur={submitFolder}
      onKeyDown={(e) => {
        if (e.key === "Enter") submitFolder();
        if (e.key === "Escape") {
          setFolderName("");
          setAddingFolder(false);
        }
      }}
      placeholder="Folder name…"
      className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-amber-950/40"
    />
  ) : (
    <button
      type="button"
      onClick={() => setAddingFolder(true)}
      className="flex items-center gap-1.5 rounded-xl border border-amber-900/15 px-3.5 py-2 text-sm font-medium text-amber-950/60 transition hover:bg-orange-100/70"
    >
      <FolderIcon className="h-4 w-4" />
      New folder
    </button>
  );

  // ---- folder view ----
  if (activeFolder) {
    const crumbs: Folder[] = [activeFolder];
    let cursor = activeFolder;
    while (cursor.parent_id) {
      const parent = folders.find((f) => f.id === cursor.parent_id);
      if (!parent) break;
      crumbs.unshift(parent);
      cursor = parent;
    }
    const subfolders = folders.filter((f) => f.parent_id === activeFolder.id);
    const folderDecks = decks.filter((d) => d.folder_id === activeFolder.id);

    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm text-amber-950/50">
          <Link
            href="/sets"
            onDragOver={(e) => allowDrop(e, "root")}
            onDragLeave={() => setDropTarget((t) => (t === "root" ? null : t))}
            onDrop={(e) => handleDrop(e, null)}
            className={`rounded px-1 hover:text-amber-950/80 ${dropZoneClass("root")}`}
          >
            Library
          </Link>
          {crumbs.map((crumb) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <span>/</span>
              {crumb.id === activeFolder.id ? (
                <span className="px-1 text-amber-950/80">{crumb.name}</span>
              ) : (
                <Link
                  href={`/sets?folder=${crumb.id}`}
                  onDragOver={(e) => allowDrop(e, crumb.id)}
                  onDragLeave={() => setDropTarget((t) => (t === crumb.id ? null : t))}
                  onDrop={(e) => handleDrop(e, crumb.id)}
                  className={`rounded px-1 hover:text-amber-950/80 ${dropZoneClass(crumb.id)}`}
                >
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
            <FolderRow key={folder.id} folder={folder} />
          ))}
          {folderDecks.map((deck) => (
            <DeckRow key={deck.id} deck={deck} />
          ))}
          {subfolders.length === 0 && folderDecks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-amber-900/15 py-14 text-center">
              <p className="text-sm text-amber-950/60">This folder is empty.</p>
              <p className="text-xs text-amber-950/40">
                Drag decks or folders here from the library, or add a subfolder above.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ---- root view ----
  const rootFolders = folders.filter((f) => !f.parent_id);
  const unfiledDecks = decks.filter((d) => !d.folder_id);
  const showFolders = filter === "all" || filter === "folders";
  const showDecks = filter === "all" || filter === "decks";
  const decksToShow = filter === "decks" ? decks : unfiledDecks;

  const pill = (value: Filter, label: string) => (
    <Link
      key={value}
      href={value === "all" ? "/sets" : `/sets?filter=${value}`}
      className={`border-b-2 px-1 pb-2 text-sm font-medium transition ${
        filter === value
          ? "border-rose-400 text-amber-950"
          : "border-transparent text-amber-950/50 hover:text-amber-950/80"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <div className="flex items-center gap-2">
          {newFolderControl}
          <Link
            href="/sets/new"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-400 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-rose-300"
          >
            <PlusIcon className="h-4 w-4" />
            New deck
          </Link>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-900/15 bg-white px-3.5 py-2.5 text-sm text-amber-950/50">
        <SearchIcon className="h-4 w-4" />
        Search your library
        <span className="ml-auto rounded-md border border-amber-900/15 px-1.5 py-0.5 text-[10px] text-amber-950/40">
          Soon
        </span>
      </div>

      <div
        className={`mb-5 flex items-center gap-5 border-b border-amber-900/10 ${dropZoneClass("root")}`}
        onDragOver={(e) => allowDrop(e, "root")}
        onDragLeave={() => setDropTarget((t) => (t === "root" ? null : t))}
        onDrop={(e) => handleDrop(e, null)}
      >
        {pill("all", "All")}
        {pill("decks", "Decks")}
        {pill("folders", "Folders")}
        <span className="ml-auto pb-2 text-[11px] text-amber-950/40">
          Drag rows onto folders to organize
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {showFolders ? rootFolders.map((folder) => <FolderRow key={folder.id} folder={folder} />) : null}
        {showDecks ? decksToShow.map((deck) => <DeckRow key={deck.id} deck={deck} />) : null}

        {(showFolders ? rootFolders.length : 0) + (showDecks ? decksToShow.length : 0) === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-amber-900/15 py-14 text-center">
            <p className="text-sm text-amber-950/60">Nothing here yet.</p>
            <Link
              href="/sets/new"
              className="flex items-center gap-2 rounded-xl bg-rose-400 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-300"
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
