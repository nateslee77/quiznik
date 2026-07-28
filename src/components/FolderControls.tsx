"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createFolder, deleteFolder, renameFolder } from "@/app/sets/actions";
import { PlusIcon } from "@/components/icons";
import type { Folder } from "@/lib/types";

// Management controls shown inside a folder view: new subfolder, rename,
// delete. Deleting cascades to subfolders; decks survive and become unfiled.
export function FolderControls({ folder }: { folder: Folder }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "subfolder" | "rename">("idle");
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) {
      setMode("idle");
      return;
    }
    startTransition(async () => {
      if (mode === "subfolder") await createFolder(trimmed, folder.id);
      if (mode === "rename") await renameFolder(folder.id, trimmed);
      setValue("");
      setMode("idle");
    });
  }

  function remove() {
    if (
      !confirm(
        `Delete "${folder.name}" and its subfolders? Decks inside are kept and become unfiled.`,
      )
    )
      return;
    startTransition(async () => {
      await deleteFolder(folder.id);
      router.push(folder.parent_id ? `/sets?folder=${folder.parent_id}` : "/sets");
    });
  }

  if (mode !== "idle") {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={submit}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setValue("");
            setMode("idle");
          }
        }}
        disabled={pending}
        placeholder={mode === "subfolder" ? "Subfolder name…" : "New name…"}
        className="rounded-lg border border-rose-300 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-amber-950/60"
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          setValue("");
          setMode("subfolder");
        }}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-amber-950/60 transition hover:bg-orange-100/70 hover:text-amber-950/90"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Subfolder
      </button>
      <button
        type="button"
        onClick={() => {
          setValue(folder.name);
          setMode("rename");
        }}
        className="rounded-lg px-2.5 py-1.5 text-sm text-amber-950/60 transition hover:bg-orange-100/70 hover:text-amber-950/90"
      >
        Rename
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="rounded-lg px-2.5 py-1.5 text-sm text-amber-950/60 transition hover:bg-red-50 hover:text-red-500"
      >
        Delete
      </button>
    </div>
  );
}
