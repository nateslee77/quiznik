"use client";

import { useState, useTransition } from "react";
import { addCard, deleteCard, updateCard } from "@/app/sets/actions";
import type { Card } from "@/lib/types";

function EditableCard({ card, setId }: { card: Card; setId: string }) {
  const [editing, setEditing] = useState(false);
  const [term, setTerm] = useState(card.term);
  const [definition, setDefinition] = useState(card.definition);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!term.trim() || !definition.trim()) return;
    startTransition(async () => {
      await updateCard(card.id, setId, term, definition);
      setEditing(false);
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteCard(card.id, setId);
    });
  }

  if (editing) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-neutral-300 p-2 dark:border-neutral-700">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="w-full min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
        />
        <input
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="w-full min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
        />
        <button
          onClick={save}
          disabled={pending}
          className="shrink-0 rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="shrink-0 rounded-md px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
        <p className="truncate text-sm font-medium">{card.term}</p>
        <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{card.definition}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Edit
        </button>
        <button
          onClick={remove}
          disabled={pending}
          className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function AddCardRow({ setId }: { setId: string }) {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!term.trim() || !definition.trim()) return;
    startTransition(async () => {
      await addCard(setId, term, definition);
      setTerm("");
      setDefinition("");
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Term"
        className="w-full min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
      />
      <input
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="Definition"
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-full min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
      />
      <button
        onClick={submit}
        disabled={pending || !term.trim() || !definition.trim()}
        className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900"
      >
        Add
      </button>
    </div>
  );
}

export function CardList({ setId, cards }: { setId: string; cards: Card[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
        {cards.length} {cards.length === 1 ? "card" : "cards"}
      </h2>
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <EditableCard key={card.id} card={card} setId={setId} />
        ))}
        <AddCardRow setId={setId} />
      </div>
    </div>
  );
}
