"use client";

import { useMemo, useState, useTransition } from "react";
import { addCard, addCardsBulk, deleteCard, updateCard } from "@/app/sets/actions";
import { parseFlashcardText, TERM_SEPARATORS, type TermSeparator } from "@/lib/parseFlashcards";
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
      <div className="flex items-start gap-2 rounded-lg border border-amber-900/20 p-2 dark:border-amber-900/20">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="w-full min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rose-400 dark:border-amber-900/20 dark:bg-neutral-900"
        />
        <input
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="w-full min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rose-400 dark:border-amber-900/20 dark:bg-neutral-900"
        />
        <button
          onClick={save}
          disabled={pending}
          className="shrink-0 rounded-md bg-rose-400 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-300"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="shrink-0 rounded-md px-2 py-1.5 text-xs text-amber-950/50 hover:bg-orange-100/70 dark:hover:bg-amber-200/60"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-900/10 p-3 dark:border-amber-900/10">
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
        <p className="truncate text-sm font-medium">{card.term}</p>
        <p className="truncate text-sm text-amber-950/50 dark:text-amber-950/60">{card.definition}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded-md px-2 py-1 text-xs text-amber-950/50 hover:bg-orange-100/70 dark:hover:bg-amber-200/60"
        >
          Edit
        </button>
        <button
          onClick={remove}
          disabled={pending}
          className="rounded-md px-2 py-1 text-xs text-amber-950/50 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-50"
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
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-900/20 p-3 dark:border-amber-900/20">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Term"
        className="w-full min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rose-400 dark:border-amber-900/20 dark:bg-neutral-900"
      />
      <input
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="Definition"
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-full min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rose-400 dark:border-amber-900/20 dark:bg-neutral-900"
      />
      <button
        onClick={submit}
        disabled={pending || !term.trim() || !definition.trim()}
        className="shrink-0 rounded-md bg-rose-400 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-300 disabled:opacity-40"
      >
        Add
      </button>
    </div>
  );
}

function PasteCardsPanel({ setId, onDone }: { setId: string; onDone: () => void }) {
  const [pasteText, setPasteText] = useState("");
  const [separator, setSeparator] = useState<TermSeparator>("tab");
  const [pending, startTransition] = useTransition();

  const preview = useMemo(() => parseFlashcardText(pasteText, separator), [pasteText, separator]);

  // Keep Tab usable inside the textarea (it types the delimiter instead of
  // moving browser focus).
  function insertTab(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setPasteText(pasteText.slice(0, start) + "\t" + pasteText.slice(end));
    requestAnimationFrame(() => el.setSelectionRange(start + 1, start + 1));
  }

  function submit() {
    if (preview.cards.length === 0) return;
    startTransition(async () => {
      await addCardsBulk(setId, preview.cards);
      setPasteText("");
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-amber-900/20 p-3 dark:border-amber-900/20">
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="cardlist-sep" className="text-amber-950/50 dark:text-amber-950/60">
          Between term and definition:
        </label>
        <select
          id="cardlist-sep"
          value={separator}
          onChange={(e) => setSeparator(e.target.value as TermSeparator)}
          className="rounded-md border border-amber-900/20 bg-white px-2 py-1 text-sm dark:border-amber-900/20 dark:bg-neutral-900"
        >
          {Object.entries(TERM_SEPARATORS).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        onKeyDown={insertTab}
        rows={6}
        placeholder={"mitochondria\tthe powerhouse of the cell\nphotosynthesis\thow plants convert light into energy"}
        className="w-full resize-y rounded-lg border border-amber-900/20 bg-white px-3.5 py-2.5 font-mono text-sm outline-none focus:border-rose-400 dark:border-amber-900/20 dark:bg-neutral-900"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-amber-950/60">
          One card per line.{" "}
          {pasteText.trim()
            ? `${preview.cards.length} card${preview.cards.length === 1 ? "" : "s"} found${
                preview.skipped ? `, ${preview.skipped} line(s) skipped` : ""
              }.`
            : ""}
        </p>
        <button
          onClick={submit}
          disabled={preview.cards.length === 0 || pending}
          className="shrink-0 rounded-lg bg-rose-400 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-300 disabled:opacity-40"
        >
          {pending ? "Adding…" : `Add ${preview.cards.length || ""} card${preview.cards.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}

function AddCardsSection({ setId }: { setId: string }) {
  const [tab, setTab] = useState<"add" | "paste">("add");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 self-start rounded-lg bg-amber-200/50 p-1 text-xs dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => setTab("add")}
          className={`rounded-md px-2.5 py-1 font-medium transition ${
            tab === "add"
              ? "bg-rose-400 text-white shadow-sm"
              : "text-amber-950/50 dark:text-amber-950/60"
          }`}
        >
          Add card
        </button>
        <button
          type="button"
          onClick={() => setTab("paste")}
          className={`rounded-md px-2.5 py-1 font-medium transition ${
            tab === "paste"
              ? "bg-rose-400 text-white shadow-sm"
              : "text-amber-950/50 dark:text-amber-950/60"
          }`}
        >
          Paste text
        </button>
      </div>

      {tab === "add" ? (
        <AddCardRow setId={setId} />
      ) : (
        <PasteCardsPanel setId={setId} onDone={() => setTab("add")} />
      )}
    </div>
  );
}

export function CardList({ setId, cards }: { setId: string; cards: Card[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-amber-950/50 dark:text-amber-950/60">
        {cards.length} {cards.length === 1 ? "card" : "cards"}
      </h2>
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <EditableCard key={card.id} card={card} setId={setId} />
        ))}
        <AddCardsSection setId={setId} />
      </div>
    </div>
  );
}
