"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { createSet, type CreateSetState } from "@/app/sets/actions";
import {
  parseFlashcardText,
  parseFlashcardTextWithChoices,
  TERM_SEPARATORS,
  type TermSeparator,
} from "@/lib/parseFlashcards";
import { useImageDrop } from "@/lib/useImageDrop";
import { ImageIcon, SpinnerIcon, XIcon } from "@/components/icons";
import { AutoTextarea } from "@/components/AutoTextarea";

type Row = { id: string; term: string; definition: string; image: File | null; distractors?: string[] };

const initialState: CreateSetState = { error: "" };

function emptyRow(): Row {
  return { id: crypto.randomUUID(), term: "", definition: "", image: null };
}

function ManualRow({
  row,
  index,
  onTermChange,
  onDefinitionChange,
  onDefinitionKeyDown,
  onImageChange,
  onRemove,
  termRef,
}: {
  row: Row;
  index: number;
  onTermChange: (value: string) => void;
  onDefinitionChange: (value: string) => void;
  onDefinitionKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onImageChange: (file: File | null) => void;
  onRemove: () => void;
  termRef: (el: HTMLTextAreaElement | null) => void;
}) {
  const distractorCount = row.distractors?.length ?? 0;
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (row.image ? URL.createObjectURL(row.image) : null), [row.image]);

  // Only cleanup here — the URL itself is derived straight from `row.image`
  // during render, so there's no state to synchronize.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // A dropped file only exists in JS — the real `<input type="file">` this
  // form submits from must also get it, or the server never sees it.
  function acceptFile(file: File) {
    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }
    onImageChange(file);
  }

  // The drop zone is the whole row, not just the photo button — a drop
  // landing a few px off a small target used to fall through to the
  // browser's default "navigate to the dropped file" behavior instead of
  // attaching it.
  const { isOver, dropHandlers } = useImageDrop(acceptFile);

  return (
    <div
      {...dropHandlers}
      className={`flex flex-col gap-2 rounded-lg border p-2 transition sm:flex-row sm:items-start sm:gap-2 sm:p-1.5 ${
        isOver ? "border-rose-400 bg-rose-50" : "border-amber-900/10 sm:border-transparent"
      }`}
    >
      {/* `sm:contents` un-groups these two pairs back into independent flex
          items at sm+, reconstructing the original single-row layout —
          below that, each group stacks as its own full-width row instead. */}
      <div className="flex items-center gap-2 sm:contents">
        <span className="w-5 shrink-0 text-right text-xs text-amber-950/60 sm:mt-2.5">{index + 1}</span>
        <AutoTextarea
          ref={termRef}
          value={row.term}
          onChange={(e) => onTermChange(e.target.value)}
          placeholder="Term"
          className="w-full min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
        />
      </div>
      <AutoTextarea
        value={row.definition}
        onChange={(e) => onDefinitionChange(e.target.value)}
        onKeyDown={onDefinitionKeyDown}
        placeholder="Definition"
        className="w-full min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
      />
      <div className="flex items-center justify-end gap-2 sm:contents">
      <div className="mt-1 shrink-0">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          name={`image-${row.id}`}
          onChange={(e) => onImageChange(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {previewUrl ? (
          <div className="relative h-9 w-9 overflow-hidden rounded-md border border-amber-900/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => {
                onImageChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label="Remove photo"
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition hover:opacity-100"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Add or drop a photo"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-amber-900/20 text-amber-950/40 transition hover:border-rose-300 hover:text-rose-400"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
        )}
      </div>
        {distractorCount > 0 ? (
          <span
            title={`${distractorCount} custom wrong answer${distractorCount === 1 ? "" : "s"} attached`}
            className="shrink-0 self-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-500 sm:mt-1"
          >
            +{distractorCount}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove card"
          className="shrink-0 rounded-md px-2 py-1 text-amber-950/60 hover:bg-orange-100/70 hover:text-red-600 sm:mt-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function NewSetForm({ folderId }: { folderId?: string | null }) {
  const [state, formAction, pending] = useActionState(createSet, initialState);
  const idBase = useId();

  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow()]);
  const [tab, setTab] = useState<"manual" | "paste">("manual");
  const [pasteText, setPasteText] = useState("");
  const [separator, setSeparator] = useState<TermSeparator>("tab");
  const [pasteMode, setPasteMode] = useState<"simple" | "choices">("simple");
  const termRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const preview = useMemo(
    () =>
      pasteMode === "choices"
        ? parseFlashcardTextWithChoices(pasteText)
        : parseFlashcardText(pasteText, separator),
    [pasteText, separator, pasteMode],
  );

  const cardsJson = useMemo(
    () =>
      JSON.stringify(
        rows
          .map((r) => ({ id: r.id, term: r.term, definition: r.definition, distractors: r.distractors }))
          .filter((c) => c.term.trim() && c.definition.trim()),
      ),
    [rows],
  );

  function updateRow(id: string, field: "term" | "definition", value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function updateRowImage(id: string, image: File | null) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, image } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  // Enter in a row's Definition field jumps to (or creates) the next row's
  // Term field, so a whole deck can be typed without touching the mouse.
  function handleDefinitionKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, rowId: string) {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    const idx = rows.findIndex((r) => r.id === rowId);
    const next = rows[idx + 1];
    if (next) {
      termRefs.current.get(next.id)?.focus();
    } else {
      const row = emptyRow();
      setRows((prev) => [...prev, row]);
      requestAnimationFrame(() => termRefs.current.get(row.id)?.focus());
    }
  }

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

  function importParsed() {
    if (preview.cards.length === 0) return;
    setRows((prev) => {
      const nonEmpty = prev.filter((r) => r.term.trim() || r.definition.trim());
      const imported = preview.cards.map((c) => ({ id: crypto.randomUUID(), ...c, image: null }));
      return [...nonEmpty, ...imported];
    });
    setPasteText("");
    setTab("manual");
  }

  const choicesFormatExample = "mitochondria\n*the powerhouse of the cell\nthe cell's genetic archive\nthe site of protein synthesis\n\nphotosynthesis\n*how plants convert light into energy\nhow plants absorb water\nhow plants release oxygen at night\n\n```python print(2 + 3)```\n*5\n6\nError\nNone";

  const validCount = rows.filter((r) => r.term.trim() && r.definition.trim()).length;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="cards" value={cardsJson} />
      {folderId ? <input type="hidden" name="folder_id" value={folderId} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-title`} className="text-sm font-medium">
          Title
        </label>
        <input
          id={`${idBase}-title`}
          name="title"
          required
          className="w-full rounded-lg border border-amber-900/20 bg-white px-3.5 py-2.5 text-base outline-none focus:border-rose-400"
          placeholder="e.g. Spanish Verbs — Unit 3"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-desc`} className="text-sm font-medium">
          Description <span className="font-normal text-amber-950/60">(optional)</span>
        </label>
        <input
          id={`${idBase}-desc`}
          name="description"
          className="w-full rounded-lg border border-amber-900/20 bg-white px-3.5 py-2.5 text-base outline-none focus:border-rose-400"
          placeholder="What's this set for?"
        />
      </div>

      <div>
        <div className="mb-3 flex gap-1 rounded-lg bg-amber-200/50 p-1">
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "manual"
                ? "bg-rose-400 text-white shadow-sm"
                : "text-amber-950/50"
            }`}
          >
            Type manually
          </button>
          <button
            type="button"
            onClick={() => setTab("paste")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "paste"
                ? "bg-rose-400 text-white shadow-sm"
                : "text-amber-950/50"
            }`}
          >
            Paste text
          </button>
        </div>

        {tab === "manual" ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-amber-950/50">
              Pasting code? Wrap it in triple backticks with the language name — e.g.{" "}
              <code className="rounded bg-amber-100 px-1">```python</code> on its own line, your code, then{" "}
              <code className="rounded bg-amber-100 px-1">```</code> — and it&rsquo;ll show up in its own
              formatted, syntax-highlighted box. Term and Definition both grow to fit multi-line pastes.
            </p>
            {rows.map((row, i) => (
              <ManualRow
                key={row.id}
                row={row}
                index={i}
                onTermChange={(value) => updateRow(row.id, "term", value)}
                onDefinitionChange={(value) => updateRow(row.id, "definition", value)}
                onDefinitionKeyDown={(e) => handleDefinitionKeyDown(e, row.id)}
                onImageChange={(file) => updateRowImage(row.id, file)}
                onRemove={() => removeRow(row.id)}
                termRef={(el) => {
                  if (el) termRefs.current.set(row.id, el);
                  else termRefs.current.delete(row.id);
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              className="mt-1 self-start rounded-lg border border-amber-900/20 px-3 py-1.5 text-sm font-medium text-amber-950/60 hover:bg-orange-100/70"
            >
              + Add card
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-1 self-start rounded-lg bg-amber-200/50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setPasteMode("simple")}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  pasteMode === "simple" ? "bg-rose-400 text-white shadow-sm" : "text-amber-950/50"
                }`}
              >
                Term + definition
              </button>
              <button
                type="button"
                onClick={() => setPasteMode("choices")}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  pasteMode === "choices" ? "bg-rose-400 text-white shadow-sm" : "text-amber-950/50"
                }`}
              >
                With answer choices
              </button>
            </div>

            {pasteMode === "simple" ? (
              <div className="flex items-center gap-2 text-sm">
                <label htmlFor={`${idBase}-sep`} className="text-amber-950/50">
                  Between term and definition:
                </label>
                <select
                  id={`${idBase}-sep`}
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value as TermSeparator)}
                  className="rounded-md border border-amber-900/20 bg-white px-2 py-1 text-sm"
                >
                  {Object.entries(TERM_SEPARATORS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-amber-950/60">
                One card per block, separated by a blank line. First line is the term; the rest are answer
                choices — mark the correct one with <code className="rounded bg-amber-100 px-1">*</code>{" "}
                (otherwise the first choice is used). For code, keep the{" "}
                <code className="rounded bg-amber-100 px-1">```lang ... ```</code> fence on a single line,
                like the third example below — multi-line snippets need the &ldquo;Type manually&rdquo; tab
                instead.
              </p>
            )}

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onKeyDown={insertTab}
              rows={8}
              placeholder={
                pasteMode === "choices"
                  ? choicesFormatExample
                  : "mitochondria\tthe powerhouse of the cell\nphotosynthesis\thow plants convert light into energy"
              }
              className="w-full resize-y rounded-lg border border-amber-900/20 bg-white px-3.5 py-2.5 font-mono text-sm outline-none focus:border-rose-400"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-950/60">
                {pasteMode === "choices" ? "One block per card." : "One card per line."}{" "}
                {pasteText.trim()
                  ? `${preview.cards.length} card${preview.cards.length === 1 ? "" : "s"} found${
                      preview.skipped ? `, ${preview.skipped} skipped` : ""
                    }.`
                  : ""}
              </p>
              <button
                type="button"
                onClick={importParsed}
                disabled={preview.cards.length === 0}
                className="rounded-lg bg-rose-400 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-300 disabled:opacity-40"
              >
                Add {preview.cards.length || ""} card{preview.cards.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}
      </div>

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || validCount === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-400 px-4 py-2.5 text-base font-medium text-white transition hover:bg-rose-300 disabled:opacity-50"
      >
        {pending ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : null}
        {pending ? "Creating…" : `Create set (${validCount} card${validCount === 1 ? "" : "s"})`}
      </button>
    </form>
  );
}
