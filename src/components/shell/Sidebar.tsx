"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createFolder } from "@/app/sets/actions";
import { signOut } from "@/app/auth/actions";
import {
  BoltIcon,
  ChatIcon,
  ChevronIcon,
  DeckIcon,
  FolderIcon,
  HomeIcon,
  LibraryIcon,
  PlusIcon,
} from "@/components/icons";
import type { Folder } from "@/lib/types";

export type SidebarDeck = { id: string; title: string; folder_id: string | null };

function NavLink({
  href,
  active,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-indigo-500/10 text-indigo-300"
          : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function DeckLink({
  deck,
  active,
  indent,
  onNavigate,
}: {
  deck: SidebarDeck;
  active: boolean;
  indent?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={`/sets/${deck.id}`}
      onClick={onNavigate}
      className={`flex items-center gap-2 rounded-lg py-1.5 pr-2 text-sm transition ${
        indent ? "pl-8" : "pl-3"
      } ${
        active
          ? "bg-indigo-500/10 text-indigo-300"
          : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
      }`}
    >
      <DeckIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{deck.title}</span>
    </Link>
  );
}

export function Sidebar({
  folders,
  decks,
  onNavigate,
}: {
  folders: Folder[];
  decks: SidebarDeck[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [pending, startTransition] = useTransition();

  const unfiled = decks.filter((d) => !d.folder_id);

  function toggleFolder(id: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submitFolder() {
    if (!folderName.trim()) {
      setAddingFolder(false);
      return;
    }
    startTransition(async () => {
      await createFolder(folderName);
      setFolderName("");
      setAddingFolder(false);
    });
  }

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4">
      {/* Workspace switcher (single workspace for now; switching comes later) */}
      <button
        type="button"
        className="mb-2 flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/5"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-semibold text-white">
          Q
        </span>
        <span className="flex-1 truncate text-sm font-semibold">My workspace</span>
        <ChevronIcon className="h-3.5 w-3.5 rotate-90 text-neutral-500" />
      </button>

      <NavLink
        href="/home"
        active={pathname === "/home"}
        icon={<HomeIcon className="h-4 w-4" />}
        label="Home"
        onNavigate={onNavigate}
      />
      <NavLink
        href="/sets"
        active={pathname === "/sets"}
        icon={<LibraryIcon className="h-4 w-4" />}
        label="Library"
        onNavigate={onNavigate}
      />
      <div className="flex cursor-default items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-600">
        <ChatIcon className="h-4 w-4" />
        Chat
        <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
          Soon
        </span>
      </div>
      <NavLink
        href="/learn"
        active={pathname === "/learn"}
        icon={<BoltIcon className="h-4 w-4" />}
        label="Learn"
        onNavigate={onNavigate}
      />

      <div className="my-3 border-t border-white/5" />

      <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-600">
        Library
      </p>

      {folders.map((folder) => {
        const open = openFolders.has(folder.id);
        const folderDecks = decks.filter((d) => d.folder_id === folder.id);
        return (
          <div key={folder.id}>
            <button
              type="button"
              onClick={() => toggleFolder(folder.id)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-white/5"
            >
              <ChevronIcon
                className={`h-3 w-3 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-90" : ""}`}
              />
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/15 text-violet-300">
                <FolderIcon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate text-left">{folder.name}</span>
              <span className="text-xs text-neutral-600">{folderDecks.length}</span>
            </button>
            {open
              ? folderDecks.map((deck) => (
                  <DeckLink
                    key={deck.id}
                    deck={deck}
                    indent
                    active={pathname.startsWith(`/sets/${deck.id}`)}
                    onNavigate={onNavigate}
                  />
                ))
              : null}
          </div>
        );
      })}

      {unfiled.map((deck) => (
        <DeckLink
          key={deck.id}
          deck={deck}
          active={pathname.startsWith(`/sets/${deck.id}`)}
          onNavigate={onNavigate}
        />
      ))}

      {addingFolder ? (
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
          disabled={pending}
          placeholder="Folder name…"
          className="mt-1 rounded-lg border border-indigo-500/40 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-neutral-600"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingFolder(true)}
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-500 transition hover:bg-white/5 hover:text-neutral-300"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          New folder
        </button>
      )}

      <Link
        href="/sets/new"
        onClick={onNavigate}
        className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
      >
        <PlusIcon className="h-4 w-4" />
        New deck
      </Link>

      <div className="mt-auto pt-4">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-500 transition hover:bg-white/5 hover:text-neutral-300"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
