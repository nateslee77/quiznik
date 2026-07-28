"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSet, updateSetDetails } from "@/app/sets/actions";
import type { FlashcardSet } from "@/lib/types";

export function SetHeader({ set }: { set: FlashcardSet }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(set.title);
  const [description, setDescription] = useState(set.description ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    if (!title.trim()) return;
    startTransition(async () => {
      await updateSetDetails(set.id, title, description);
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
          className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xl font-semibold outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Save
          </button>
          <button
            onClick={() => {
              setTitle(set.title);
              setDescription(set.description ?? "");
              setEditing(false);
            }}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
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
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{set.description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded-md px-2.5 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
        >
          Edit
        </button>
        <button
          onClick={remove}
          disabled={pending}
          className="rounded-md px-2.5 py-1.5 text-sm text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
