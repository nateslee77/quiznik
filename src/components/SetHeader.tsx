"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSet, moveSetToFolder, updateSetDetails } from "@/app/sets/actions";
import type { FlashcardSet, Folder } from "@/lib/types";

function folderPath(folders: Folder[], folder: Folder): string {
  const names: string[] = [folder.name];
  let current = folder;
  while (current.parent_id) {
    const parent = folders.find((f) => f.id === current.parent_id);
    if (!parent) break;
    names.unshift(parent.name);
    current = parent;
  }
  return names.join(" / ");
}

export function SetHeader({ set, folders }: { set: FlashcardSet; folders: Folder[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(set.title);
  const [description, setDescription] = useState(set.description ?? "");
  const [folderId, setFolderId] = useState<string>(set.folder_id ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    if (!title.trim()) return;
    startTransition(async () => {
      await updateSetDetails(set.id, title, description);
      if ((set.folder_id ?? "") !== folderId) {
        await moveSetToFolder(set.id, folderId || null);
      }
      setEditing(false);
    });
  }

  function remove() {
    if (!confirm(`Delete "${set.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteSet(set.id);
      router.push("/sets");
    });
  }

  if (editing) {
    return (
      <div className="mb-6 flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xl font-semibold outline-none focus:border-indigo-400"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <select
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        >
          <option value="">No folder</option>
          {[...folders]
            .map((folder) => ({ folder, path: folderPath(folders, folder) }))
            .sort((a, b) => a.path.localeCompare(b.path))
            .map(({ folder, path }) => (
              <option key={folder.id} value={folder.id}>
                {path}
              </option>
            ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-xl bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => {
              setTitle(set.title);
              setDescription(set.description ?? "");
              setFolderId(set.folder_id ?? "");
              setEditing(false);
            }}
            className="rounded-xl border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{set.title}</h1>
        {set.description ? (
          <p className="mt-1 text-sm text-neutral-400">{set.description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg px-2.5 py-1.5 text-sm text-neutral-400 transition hover:bg-white/5 hover:text-white"
        >
          Edit
        </button>
        <button
          onClick={remove}
          disabled={pending}
          className="rounded-lg px-2.5 py-1.5 text-sm text-neutral-400 transition hover:bg-red-950 hover:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
