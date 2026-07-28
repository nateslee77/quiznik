"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { createSet, type CreateSetState } from "@/app/sets/actions";
import { parseFlashcardText, TERM_SEPARATORS, type TermSeparator } from "@/lib/parseFlashcards";

type Row = { id: string; term: string; definition: string };

const initialState: CreateSetState = { error: "" };

function emptyRow(): Row {
  return { id: crypto.randomUUID(), term: "", definition: "" };
}

export function NewSetForm() {
  const [state, formAction, pending] = useActionState(createSet, initialState);
  const idBase = useId();

  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow()]);
  const [tab, setTab] = useState<"manual" | "paste">("manual");
  const [pasteText, setPasteText] = useState("");
  const [separator, setSeparator] = useState<TermSeparator>("tab");

  const preview = useMemo(() => parseFlashcardText(pasteText, separator), [pasteText, separator]);

  const cardsJson = useMemo(
    () =>
      JSON.stringify(
        rows
          .map((r) => ({ term: r.term, definition: r.definition }))
          .filter((c) => c.term.trim() && c.definition.trim()),
      ),
    [rows],
  );

  function updateRow(id: string, field: "term" | "definition", value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  function importParsed() {
    if (preview.cards.length === 0) return;
    setRows((prev) => {
      const nonEmpty = prev.filter((r) => r.term.trim() || r.definition.trim());
      const imported = preview.cards.map((c) => ({ id: crypto.randomUUID(), ...c }));
      return [...nonEmpty, ...imported];
    });
    setPasteText("");
    setTab("manual");
  }

  const validCount = rows.filter((r) => r.term.trim() && r.definition.trim()).length;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="cards" value={cardsJson} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-title`} className="text-sm font-medium">
          Title
        </label>
        <input
          id={`${idBase}-title`}
          name="title"
          required
          className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-base outline-none focus:border-indigo-400 dark:border-neutral-700 dark:bg-neutral-900"
          placeholder="e.g. Spanish Verbs — Unit 3"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-desc`} className="text-sm font-medium">
          Description <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <input
          id={`${idBase}-desc`}
          name="description"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-base outline-none focus:border-indigo-400 dark:border-neutral-700 dark:bg-neutral-900"
          placeholder="What's this set for?"
        />
      </div>

      <div>
        <div className="mb-3 flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "manual"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            Type manually
          </button>
          <button
            type="button"
            onClick={() => setTab("paste")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "paste"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            Paste text
          </button>
        </div>

        {tab === "manual" ? (
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <div key={row.id} className="flex items-start gap-2">
                <span className="mt-2.5 w-5 shrink-0 text-right text-xs text-neutral-400">
                  {i + 1}
                </span>
                <input
                  value={row.term}
                  onChange={(e) => updateRow(row.id, "term", e.target.value)}
                  placeholder="Term"
                  className="w-full min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  value={row.definition}
                  onChange={(e) => updateRow(row.id, "definition", e.target.value)}
                  placeholder="Definition"
                  className="w-full min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-neutral-700 dark:bg-neutral-900"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label="Remove card"
                  className="mt-1 shrink-0 rounded-md px-2 py-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-900"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              className="mt-1 self-start rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              + Add card
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor={`${idBase}-sep`} className="text-neutral-500 dark:text-neutral-400">
                Between term and definition:
              </label>
              <select
                id={`${idBase}-sep`}
                value={separator}
                onChange={(e) => setSeparator(e.target.value as TermSeparator)}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
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
              rows={8}
              placeholder={"mitochondria\tthe powerhouse of the cell\nphotosynthesis\thow plants convert light into energy"}
              className="w-full resize-y rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 font-mono text-sm outline-none focus:border-indigo-400 dark:border-neutral-700 dark:bg-neutral-900"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400">
                One card per line.{" "}
                {pasteText.trim()
                  ? `${preview.cards.length} card${preview.cards.length === 1 ? "" : "s"} found${
                      preview.skipped ? `, ${preview.skipped} line(s) skipped` : ""
                    }.`
                  : ""}
              </p>
              <button
                type="button"
                onClick={importParsed}
                disabled={preview.cards.length === 0}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-40"
              >
                Add {preview.cards.length || ""} card{preview.cards.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}
      </div>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || validCount === 0}
        className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Creating…" : `Create set (${validCount} card${validCount === 1 ? "" : "s"})`}
      </button>
    </form>
  );
}
