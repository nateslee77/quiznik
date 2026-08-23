"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addCard,
  addCardsBulk,
  deleteCard,
  removeCardImage,
  updateCard,
  uploadCardImage,
} from "@/app/sets/actions";
import {
  parseFlashcardText,
  parseFlashcardTextWithChoices,
  TERM_SEPARATORS,
  type ParsedCard,
  type TermSeparator,
} from "@/lib/parseFlashcards";
import { cardImageUrl } from "@/lib/supabase/storage";
import { useImageDrop } from "@/lib/useImageDrop";
import { ImageIcon, SpinnerIcon, XIcon } from "@/components/icons";
import { FormattedText } from "@/components/FormattedText";
import { AutoTextarea } from "@/components/AutoTextarea";
import { STAGE_COLORS, STAGE_LABELS, type Stage } from "@/lib/studyStage";
import type { Card, StudyStatus } from "@/lib/types";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// A card whose id hasn't been confirmed by the server yet (optimistic add).
function isGhost(id: string): boolean {
  return id.startsWith("temp-");
}

// Purely presentational — all pick/upload/remove logic lives in the parent
// row (EditableCard), because the *drop zone* needs to be the whole row,
// not this small button (a drop landing a few px off a tiny target used to
// fall through to the browser's default "navigate to the file" behavior).
function CardImageControl({
  src,
  pending,
  editing,
  inputRef,
  onPick,
  onRemove,
}: {
  src: string | null;
  pending: boolean;
  editing: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File | null) => void;
  onRemove: () => void;
}) {
  if (!editing) {
    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-20 sm:w-20" />
    ) : null;
  }

  return (
    <div className="relative shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={src ? "Replace photo" : "Add or drop a photo"}
        className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border transition sm:h-20 sm:w-20 ${
          src
            ? "border-amber-900/20"
            : "border-dashed border-amber-900/20 text-amber-950/40 hover:border-rose-300 hover:text-rose-400"
        }`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className={`h-full w-full object-cover ${pending ? "opacity-50" : ""}`} />
        ) : (
          <ImageIcon className="h-5 w-5" />
        )}
        {pending ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/10">
            <SpinnerIcon className="h-5 w-5 animate-spin text-white drop-shadow" />
          </span>
        ) : null}
      </button>
      {src ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove photo"
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-amber-950/60 shadow ring-1 ring-amber-900/15 hover:text-red-600"
        >
          <XIcon className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

function EditableCard({
  card,
  setId,
  stage,
  onDeleted,
  onError,
}: {
  card: Card;
  setId: string;
  stage: Stage;
  onDeleted: (cardId: string) => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [term, setTerm] = useState(card.term);
  const [definition, setDefinition] = useState(card.definition);
  const [pending, startTransition] = useTransition();
  const ghost = isGhost(card.id);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [imagePending, startImageTransition] = useTransition();
  const imageSrc = previewUrl ?? (imageRemoved ? null : cardImageUrl(card.image_path));

  function pickImage(file: File | null) {
    if (!file || ghost) return;
    onError("");
    setImageRemoved(false);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    startImageTransition(async () => {
      try {
        await uploadCardImage(card.id, setId, file);
      } catch (err) {
        setPreviewUrl(null);
        onError(errorMessage(err, "Couldn't upload that photo. Try again."));
      }
    });
  }

  function removeImage() {
    onError("");
    setPreviewUrl(null);
    setImageRemoved(true);
    startImageTransition(async () => {
      try {
        await removeCardImage(card.id, setId);
      } catch (err) {
        setImageRemoved(false);
        onError(errorMessage(err, "Couldn't remove that photo. Try again."));
      }
    });
  }

  // Drop zone covers the whole row (below), not just the small photo
  // button — a dropped file also needs syncing onto the real file input in
  // case the user picks again from the same control afterward.
  const { isOver, dropHandlers } = useImageDrop((file) => {
    if (imageInputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      imageInputRef.current.files = transfer.files;
    }
    pickImage(file);
  });

  function save() {
    if (!term.trim() || !definition.trim()) return;
    startTransition(async () => {
      await updateCard(card.id, setId, term, definition);
      setEditing(false);
    });
  }

  function remove() {
    if (!confirm(`Delete "${card.term}"? This can't be undone.`)) return;
    onDeleted(card.id);
  }

  const imageControl = (
    <CardImageControl
      src={imageSrc}
      pending={imagePending}
      editing={editing}
      inputRef={imageInputRef}
      onPick={pickImage}
      onRemove={removeImage}
    />
  );

  const dropRing = isOver ? "border-rose-400 bg-rose-50" : "";

  if (editing) {
    return (
      <div
        {...dropHandlers}
        className={`flex flex-col gap-2 rounded-lg border p-2 transition sm:flex-row sm:items-start sm:gap-2 ${dropRing || "border-amber-900/20"}`}
      >
        {imageControl}
        <AutoTextarea
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="w-full min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rose-400"
        />
        <AutoTextarea
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="w-full min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rose-400"
        />
        <div className="flex gap-2 sm:contents">
          <button
            onClick={save}
            disabled={pending}
            className="shrink-0 rounded-md bg-rose-400 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-300"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="shrink-0 rounded-md px-2 py-1.5 text-xs text-amber-950/50 hover:bg-orange-100/70"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...(ghost ? {} : dropHandlers)}
      className={`relative flex flex-col gap-3 rounded-xl border p-4 transition sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${
        dropRing || "border-amber-900/10"
      } ${ghost ? "opacity-50" : ""}`}
    >
      {!ghost ? (
        <span
          title={STAGE_LABELS[stage]}
          aria-label={STAGE_LABELS[stage]}
          className={`absolute left-2 top-2 h-2 w-2 rounded-full ${STAGE_COLORS[stage].dot}`}
        />
      ) : null}
      {imageControl}
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 sm:gap-4">
        <div className="text-base font-medium">
          <FormattedText text={card.term} />
        </div>
        <div className="text-base text-amber-950/60">
          <FormattedText text={card.definition} />
        </div>
      </div>
      <div className="flex shrink-0 gap-1 self-start sm:self-center">
        <button
          onClick={() => setEditing(true)}
          disabled={ghost}
          className="rounded-md px-2.5 py-1.5 text-sm text-amber-950/50 hover:bg-orange-100/70 disabled:opacity-40"
        >
          Edit
        </button>
        <button
          onClick={remove}
          disabled={ghost}
          className="rounded-md px-2.5 py-1.5 text-sm text-amber-950/50 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function AddCardRow({
  onAdd,
}: {
  onAdd: (term: string, definition: string, image: File | null) => void;
}) {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isOver, dropHandlers } = useImageDrop(setImage);

  function submit() {
    if (!term.trim() || !definition.trim()) return;
    onAdd(term, definition, image);
    setTerm("");
    setDefinition("");
    setImage(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      {...dropHandlers}
      className={`flex flex-col gap-2 rounded-lg border border-dashed p-3 transition sm:flex-row sm:items-start ${
        isOver ? "border-rose-400 bg-rose-50" : "border-amber-900/20"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      <div className="flex items-center gap-2 sm:contents">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Add or drop a photo"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition ${
            image
              ? "border-rose-300 text-rose-500"
              : "border-dashed border-amber-900/20 text-amber-950/40 hover:border-rose-300 hover:text-rose-500"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <AutoTextarea
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Term"
          className="w-full min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rose-400"
        />
      </div>
      <AutoTextarea
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="Definition"
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey) return;
          e.preventDefault();
          submit();
        }}
        className="w-full min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rose-400"
      />
      <button
        onClick={submit}
        disabled={!term.trim() || !definition.trim()}
        className="shrink-0 rounded-md bg-rose-400 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-300 disabled:opacity-40"
      >
        Add
      </button>
    </div>
  );
}

function PasteCardsPanel({
  onBulkAdd,
  onDone,
}: {
  onBulkAdd: (cards: ParsedCard[]) => void;
  onDone: () => void;
}) {
  const [pasteText, setPasteText] = useState("");
  const [separator, setSeparator] = useState<TermSeparator>("tab");
  const [pasteMode, setPasteMode] = useState<"simple" | "choices">("simple");

  const preview = useMemo(
    () =>
      pasteMode === "choices"
        ? parseFlashcardTextWithChoices(pasteText)
        : parseFlashcardText(pasteText, separator),
    [pasteText, separator, pasteMode],
  );

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
    onBulkAdd(preview.cards);
    setPasteText("");
    onDone();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-amber-900/20 p-3">
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
          <label htmlFor="cardlist-sep" className="text-amber-950/50">
            Between term and definition:
          </label>
          <select
            id="cardlist-sep"
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
          choices — mark the correct one with <code className="rounded bg-amber-100 px-1">*</code> (otherwise
          the first choice is used). Code fences (
          <code className="rounded bg-amber-100 px-1">```lang ... ```</code>) can span multiple lines —
          including blank ones inside the snippet, like the third example below — the parser treats the
          whole fence as one line automatically.
        </p>
      )}

      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        onKeyDown={insertTab}
        rows={6}
        placeholder={
          pasteMode === "choices"
            ? "mitochondria\n*the powerhouse of the cell\nthe cell's genetic archive\nthe site of protein synthesis\n\nphotosynthesis\n*how plants convert light into energy\nhow plants absorb water\nhow plants release oxygen at night\n\n```python\ndef add(a, b):\n    return a + b\n\nprint(add(2, 3))\n```\n*5\n6\nError\nNone"
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
          onClick={submit}
          disabled={preview.cards.length === 0}
          className="shrink-0 rounded-lg bg-rose-400 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-300 disabled:opacity-40"
        >
          Add {preview.cards.length || ""} card{preview.cards.length === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}

function AddCardsSection({
  onAdd,
  onBulkAdd,
}: {
  onAdd: (term: string, definition: string, image: File | null) => void;
  onBulkAdd: (cards: ParsedCard[]) => void;
}) {
  const [tab, setTab] = useState<"add" | "paste">("add");

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-900/10 bg-orange-50/40 p-3">
      <div className="flex gap-1 self-start rounded-lg bg-amber-200/50 p-1 text-xs">
        <button
          type="button"
          onClick={() => setTab("add")}
          className={`rounded-md px-2.5 py-1 font-medium transition ${
            tab === "add"
              ? "bg-rose-400 text-white shadow-sm"
              : "text-amber-950/50"
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
              : "text-amber-950/50"
          }`}
        >
          Paste text
        </button>
      </div>

      {tab === "add" ? (
        <>
          <AddCardRow onAdd={onAdd} />
          <p className="text-xs text-amber-950/50">
            Got code? Paste it straight into Term or Definition, wrapped in triple backticks with the
            language name — e.g. <code className="rounded bg-amber-100 px-1">```python</code> on its own
            line, your code, then <code className="rounded bg-amber-100 px-1">```</code> — and it&rsquo;ll
            render in its own formatted box.
          </p>
        </>
      ) : (
        <PasteCardsPanel onBulkAdd={onBulkAdd} onDone={() => setTab("add")} />
      )}
    </div>
  );
}

function tempCard(setId: string, position: number, term: string, definition: string): Card {
  return {
    id: `temp-${crypto.randomUUID()}`,
    set_id: setId,
    term,
    definition,
    position,
    image_path: null,
    distractors: null,
    created_at: new Date().toISOString(),
  };
}

export function CardList({
  setId,
  cards: serverCards,
  progressByCardId = {},
}: {
  setId: string;
  cards: Card[];
  progressByCardId?: Record<string, StudyStatus>;
}) {
  const router = useRouter();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [ghostCards, setGhostCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reset the optimistic overlay whenever fresh server data arrives (same
  // "compare during render" pattern LibraryBrowser uses for its own
  // ghost/hidden overlay).
  const [prevServerCards, setPrevServerCards] = useState(serverCards);
  if (serverCards !== prevServerCards) {
    setPrevServerCards(serverCards);
    setHiddenIds(new Set());
    setGhostCards([]);
  }

  const cards = [...serverCards.filter((c) => !hiddenIds.has(c.id)), ...ghostCards];

  function handleDeleted(cardId: string) {
    setError(null);
    setHiddenIds((prev) => new Set(prev).add(cardId));
    (async () => {
      try {
        await deleteCard(cardId, setId);
        router.refresh();
      } catch (err) {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
        setError(errorMessage(err, "Couldn't delete that card. Try again."));
      }
    })();
  }

  function handleAdd(term: string, definition: string, image: File | null) {
    setError(null);
    const ghost = tempCard(setId, cards.length, term, definition);
    setGhostCards((prev) => [...prev, ghost]);
    (async () => {
      let id: string;
      try {
        ({ id } = await addCard(setId, term, definition));
      } catch (err) {
        setGhostCards((prev) => prev.filter((c) => c.id !== ghost.id));
        setError(errorMessage(err, "Couldn't add that card. Try again."));
        return;
      }
      // The card itself is safely created at this point — refresh now so a
      // failed image upload below can never make a real card disappear.
      router.refresh();
      if (image) {
        try {
          await uploadCardImage(id, setId, image);
          router.refresh();
        } catch (err) {
          setError(errorMessage(err, "Card added, but the photo didn't upload. Try again from the card."));
        }
      }
    })();
  }

  function handleBulkAdd(parsed: ParsedCard[]) {
    setError(null);
    const ghosts = parsed.map((c, i) => tempCard(setId, cards.length + i, c.term, c.definition));
    setGhostCards((prev) => [...prev, ...ghosts]);
    (async () => {
      try {
        await addCardsBulk(setId, parsed);
        router.refresh();
      } catch (err) {
        const ghostIds = new Set(ghosts.map((g) => g.id));
        setGhostCards((prev) => prev.filter((c) => !ghostIds.has(c.id)));
        setError(errorMessage(err, "Couldn't add those cards. Try again."));
      }
    })();
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-amber-950/50">
        {cards.length} {cards.length === 1 ? "card" : "cards"}
      </h2>
      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}
      <div className="flex flex-col gap-3">
        <AddCardsSection onAdd={handleAdd} onBulkAdd={handleBulkAdd} />
        {cards.map((card) => (
          <EditableCard
            key={card.id}
            card={card}
            setId={setId}
            stage={progressByCardId[card.id] ?? "new"}
            onDeleted={handleDeleted}
            onError={(msg) => setError(msg || null)}
          />
        ))}
      </div>
    </div>
  );
}
