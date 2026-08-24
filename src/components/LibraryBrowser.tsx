"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createFolder, moveFolder, moveSetToFolder } from "@/app/sets/actions";
import { FolderControls } from "@/components/FolderControls";
import { DeckIcon, FolderIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { folderAncestors } from "@/lib/folderPath";
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
type DragPayload = { kind: "deck" | "folder"; id: string; title: string };

const MOUSE_DRAG_THRESHOLD = 6; // px of movement before a mouse-down becomes a drag
const TOUCH_MOVE_CANCEL_THRESHOLD = 10; // px of movement that cancels a pending long-press
const TOUCH_LONG_PRESS_MS = 350; // hold time before a touch/pen turns into a drag

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
  folders: serverFolders,
  decks: serverDecks,
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
  const [error, setError] = useState<string | null>(null);

  // Pointer-based drag state (works for mouse, touch, and pen alike — the
  // native HTML5 drag-and-drop API never fires on touch devices at all, so
  // this is the only thing that makes dragging work on a phone/tablet).
  const [draggingPayload, setDraggingPayload] = useState<DragPayload | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  // Suppresses the click/navigation that would otherwise fire right after
  // a drag ends on the same element (a plain mutable ref, not state, since
  // it must be readable synchronously inside the click handler that the
  // browser dispatches after pointerup — no render cycle to wait on).
  const justDraggedRef = useRef(false);

  // Optimistic overlay on top of server-fetched data: rows moved (or a
  // folder just created) show up/disappear instantly on drop/submit,
  // without waiting for a round-trip. `router.refresh()` still runs in the
  // background to fetch true state; once it lands, fresh props replace
  // these overrides (the effect below clears them whenever props change).
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [ghostFolders, setGhostFolders] = useState<Folder[]>([]);

  // Reset the optimistic overlay whenever fresh server data arrives (from
  // router.refresh() after a move/create resolves) — the React-recommended
  // pattern for "adjust state when a prop changes" is comparing during
  // render, not in an effect (avoids an extra render pass).
  const [prevServerFolders, setPrevServerFolders] = useState(serverFolders);
  const [prevServerDecks, setPrevServerDecks] = useState(serverDecks);
  if (serverFolders !== prevServerFolders || serverDecks !== prevServerDecks) {
    setPrevServerFolders(serverFolders);
    setPrevServerDecks(serverDecks);
    setHiddenIds(new Set());
    setGhostFolders([]);
  }

  const folders = [...serverFolders, ...ghostFolders].filter((f) => !hiddenIds.has(f.id));
  const decks = serverDecks.filter((d) => !hiddenIds.has(d.id));

  const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : undefined;

  // ---- drag and drop (pointer-events based) ----
  function performMove(payload: DragPayload, targetFolderId: string | null) {
    setError(null);
    if (payload.kind === "folder") {
      if (payload.id === targetFolderId) return;
      // Client-side guard against dropping into own subtree (server re-checks).
      if (targetFolderId && subtreeIds(folders, payload.id).has(targetFolderId)) return;
      setHiddenIds((prev) => new Set(prev).add(payload.id));
      startTransition(async () => {
        try {
          await moveFolder(payload.id, targetFolderId);
          router.refresh();
        } catch {
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.delete(payload.id);
            return next;
          });
          setError("Couldn't move that folder. Try again.");
        }
      });
    } else {
      const deck = decks.find((d) => d.id === payload.id);
      if (deck && deck.folder_id === targetFolderId) return;
      setHiddenIds((prev) => new Set(prev).add(payload.id));
      startTransition(async () => {
        try {
          await moveSetToFolder(payload.id, targetFolderId);
          router.refresh();
        } catch {
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.delete(payload.id);
            return next;
          });
          setError("Couldn't move that deck. Try again.");
        }
      });
    }
  }

  function dropTargetAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return el?.closest<HTMLElement>("[data-drop-target]")?.dataset.dropTarget ?? null;
  }

  function beginDrag(e: React.PointerEvent, payload: DragPayload) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const isTouch = e.pointerType !== "mouse";
    let dragging = false;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;

    function activate(x: number, y: number) {
      dragging = true;
      setDraggingPayload(payload);
      setDragPos({ x, y });
      setDropTarget(dropTargetAt(x, y));
    }

    function cleanup() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      if (longPressTimer) clearTimeout(longPressTimer);
    }

    function onMove(ev: PointerEvent) {
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);

      if (!dragging) {
        if (isTouch) {
          // Waiting on the long-press timer — bail if this looks like a
          // scroll gesture instead, and let the browser handle it normally.
          if (dist > TOUCH_MOVE_CANCEL_THRESHOLD && longPressTimer) {
            cleanup();
          }
          return;
        }
        if (dist > MOUSE_DRAG_THRESHOLD) activate(ev.clientX, ev.clientY);
        return;
      }

      ev.preventDefault();
      setDragPos({ x: ev.clientX, y: ev.clientY });
      setDropTarget(dropTargetAt(ev.clientX, ev.clientY));
    }

    function finish(x: number, y: number, shouldDrop: boolean) {
      cleanup();
      if (dragging && shouldDrop) {
        justDraggedRef.current = true;
        const key = dropTargetAt(x, y);
        performMove(payload, key === "root" ? null : key);
      }
      setDraggingPayload(null);
      setDragPos(null);
      setDropTarget(null);
    }

    function onUp(ev: PointerEvent) {
      finish(ev.clientX, ev.clientY, true);
    }
    function onCancel(ev: PointerEvent) {
      finish(ev.clientX, ev.clientY, false);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);

    if (isTouch) {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        activate(startX, startY);
      }, TOUCH_LONG_PRESS_MS);
    }
  }

  function suppressClickAfterDrag(e: React.MouseEvent) {
    if (justDraggedRef.current) {
      e.preventDefault();
      justDraggedRef.current = false;
    }
  }

  function dropZoneClass(key: string) {
    return dropTarget === key ? "ring-2 ring-rose-400 ring-offset-2 ring-offset-[#fff7f0]" : "";
  }

  // ---- new folder ----
  function submitFolder() {
    const trimmed = folderName.trim();
    setAddingFolder(false);
    setFolderName("");
    if (!trimmed) return;

    setError(null);
    const tempId = `temp-${Date.now()}`;
    setGhostFolders((prev) => [
      ...prev,
      {
        id: tempId,
        user_id: "",
        parent_id: activeFolderId,
        name: trimmed,
        position: 0,
        created_at: new Date().toISOString(),
      },
    ]);
    startTransition(async () => {
      try {
        await createFolder(trimmed, activeFolderId);
        router.refresh();
      } catch {
        setGhostFolders((prev) => prev.filter((f) => f.id !== tempId));
        setError("Couldn't create that folder. Try again.");
      }
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
        data-drop-target={folder.id}
        draggable={false}
        onClick={suppressClickAfterDrag}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => beginDrag(e, { kind: "folder", id: folder.id, title: folder.name })}
        className={`flex touch-manipulation items-center gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/50 p-3.5 transition select-none hover:border-amber-300 hover:bg-amber-50 [-webkit-touch-callout:none] ${dropZoneClass(folder.id)} ${draggingPayload?.id === folder.id ? "opacity-40" : ""}`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center">
          <FolderIcon className="h-8 w-8 text-amber-400" />
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
      draggable={false}
      onClick={suppressClickAfterDrag}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => beginDrag(e, { kind: "deck", id: deck.id, title: deck.title })}
      className={`flex touch-manipulation items-center gap-3 rounded-2xl border border-amber-900/10 bg-surface p-3.5 transition select-none hover:border-amber-900/15 hover:bg-orange-50 [-webkit-touch-callout:none] ${draggingPayload?.id === deck.id ? "opacity-40" : ""}`}
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
        <span className="rounded-full bg-rose-400 px-2 py-0.5 text-xs font-semibold text-rose-contrast">
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
      className="rounded-xl border border-rose-300 bg-surface px-3 py-2 text-sm outline-none placeholder:text-amber-950/40"
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

  const errorBanner = error ? (
    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
  ) : null;

  const dragGhost =
    draggingPayload && dragPos ? (
      <div
        aria-hidden
        className="pointer-events-none fixed z-50 flex items-center gap-2 rounded-xl border border-rose-300 bg-surface px-3 py-2 text-sm font-medium shadow-lg"
        style={{ left: dragPos.x + 12, top: dragPos.y + 12 }}
      >
        {draggingPayload.kind === "folder" ? (
          <FolderIcon className="h-4 w-4 text-amber-700" />
        ) : (
          <DeckIcon className="h-4 w-4 text-rose-500" />
        )}
        {draggingPayload.title}
      </div>
    ) : null;

  // ---- folder view ----
  if (activeFolder) {
    const crumbs = folderAncestors(folders, activeFolder.id);
    const subfolders = folders.filter((f) => f.parent_id === activeFolder.id);
    const folderDecks = decks.filter((d) => d.folder_id === activeFolder.id);

    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
        {dragGhost}
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm text-amber-950/50">
          <Link
            href="/sets"
            data-drop-target="root"
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
                  data-drop-target={crumb.id}
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
          <div className="flex flex-wrap items-center gap-2">
            <FolderControls folder={activeFolder} />
            <Link
              href={`/sets/new?folder=${activeFolder.id}`}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-400 px-3.5 py-2 text-sm font-medium text-rose-contrast transition hover:bg-rose-300"
            >
              <PlusIcon className="h-4 w-4" />
              New deck
            </Link>
          </div>
        </div>

        {errorBanner}

        <div className="flex flex-col gap-2">
          {subfolders.map((folder) => (
            <FolderRow key={folder.id} folder={folder} />
          ))}
          {folderDecks.map((deck) => (
            <DeckRow key={deck.id} deck={deck} />
          ))}
          {subfolders.length === 0 && folderDecks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-amber-900/15 py-14 text-center">
              <p className="text-sm text-amber-950/60">This folder is empty.</p>
              <Link
                href={`/sets/new?folder=${activeFolder.id}`}
                className="flex items-center gap-2 rounded-xl bg-rose-400 px-4 py-2 text-sm font-medium text-rose-contrast transition hover:bg-rose-300"
              >
                <PlusIcon className="h-4 w-4" />
                Create flashcards
              </Link>
              <p className="text-xs text-amber-950/40">
                Or drag decks and folders here (press and hold on touch) from the library.
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
      {dragGhost}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <div className="flex items-center gap-2">
          {newFolderControl}
          <Link
            href="/sets/new"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-400 px-3.5 py-2 text-sm font-medium text-rose-contrast transition hover:bg-rose-300"
          >
            <PlusIcon className="h-4 w-4" />
            New deck
          </Link>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-900/15 bg-surface px-3.5 py-2.5 text-sm text-amber-950/50">
        <SearchIcon className="h-4 w-4" />
        Search your library
        <span className="ml-auto rounded-md border border-amber-900/15 px-1.5 py-0.5 text-[10px] text-amber-950/40">
          Soon
        </span>
      </div>

      {errorBanner}

      <div
        data-drop-target="root"
        className={`mb-5 flex items-center gap-5 border-b border-amber-900/10 ${dropZoneClass("root")}`}
      >
        {pill("all", "All")}
        {pill("decks", "Decks")}
        {pill("folders", "Folders")}
        <span className="ml-auto pb-2 text-[11px] text-amber-950/40">
          Drag rows onto folders (press and hold on touch) to organize
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
              className="flex items-center gap-2 rounded-xl bg-rose-400 px-4 py-2 text-sm font-medium text-rose-contrast transition hover:bg-rose-300"
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
