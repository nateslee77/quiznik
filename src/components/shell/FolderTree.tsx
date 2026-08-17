"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronIcon, FolderIcon } from "@/components/icons";
import { folderAncestors } from "@/lib/folderPath";
import type { Folder } from "@/lib/types";

function FolderRow({
  folder,
  depth,
  childrenByParent,
  activeFolderId,
  expanded,
  onToggle,
  onNavigate,
}: {
  folder: Folder;
  depth: number;
  childrenByParent: Map<string | null, Folder[]>;
  activeFolderId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNavigate?: () => void;
}) {
  const children = childrenByParent.get(folder.id) ?? [];
  const hasChildren = children.length > 0;
  const isOpen = expanded.has(folder.id);
  const isActive = folder.id === activeFolderId;

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-lg pr-2 text-sm font-medium transition ${
          isActive ? "bg-rose-100 text-rose-500" : "text-amber-950/60 hover:bg-orange-100/70 hover:text-amber-950"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(folder.id)}
            aria-label={isOpen ? "Collapse folder" : "Expand folder"}
            className="shrink-0 rounded p-0.5 text-amber-950/40 hover:text-amber-950"
          >
            <ChevronIcon className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Link
          href={`/sets?folder=${folder.id}`}
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5"
        >
          <FolderIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{folder.name}</span>
        </Link>
      </div>
      {hasChildren && isOpen ? (
        <div>
          {children.map((child) => (
            <FolderRow
              key={child.id}
              folder={child}
              depth={depth + 1}
              childrenByParent={childrenByParent}
              activeFolderId={activeFolderId}
              expanded={expanded}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FolderTree(props: { folders: Folder[]; onNavigate?: () => void }) {
  return (
    <Suspense fallback={null}>
      <FolderTreeInner {...props} />
    </Suspense>
  );
}

function FolderTreeInner({
  folders,
  onNavigate,
}: {
  folders: Folder[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFolderId = pathname === "/sets" ? searchParams.get("folder") : null;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Auto-expand the active folder's ancestor chain so deep links don't land
  // collapsed with no context (Drive keeps the current path visible too).
  // Adjusted during render (not an effect) the same way LibraryBrowser/
  // CardList reset their own optimistic overlays on prop change — a ref
  // value tracked via useState just to detect "did this change".
  const [prevActiveFolderId, setPrevActiveFolderId] = useState<string | null | undefined>(undefined);
  if (activeFolderId !== prevActiveFolderId) {
    setPrevActiveFolderId(activeFolderId);
    const ancestors = activeFolderId ? folderAncestors(folders, activeFolderId) : [];
    if (ancestors.length > 0) {
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const f of ancestors) next.add(f.id);
        return next;
      });
    }
  }

  if (folders.length === 0) return null;

  const childrenByParent = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const key = folder.parent_id;
    const list = childrenByParent.get(key) ?? [];
    list.push(folder);
    childrenByParent.set(key, list);
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }

  const roots = childrenByParent.get(null) ?? [];

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-0.5 py-0.5">
      {roots.map((folder) => (
        <FolderRow
          key={folder.id}
          folder={folder}
          depth={0}
          childrenByParent={childrenByParent}
          activeFolderId={activeFolderId}
          expanded={expanded}
          onToggle={toggle}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
