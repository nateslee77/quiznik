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
  TERM_SEPARATORS,
  type ParsedCard,
  type TermSeparator,
} from "@/lib/parseFlashcards";
import { cardImageUrl } from "@/lib/supabase/storage";
import { useImageDrop } from "@/lib/useImageDrop";
import { ImageIcon, XIcon } from "@/components/icons";
import type { Card } from "@/lib/types";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// A card whose id hasn't been confirmed by the server yet (optimistic add).
function isGhost(id: string): boolean {
  return id.startsWith("temp-");
}

function CardImageControl({
  card,
  setId,
  editing,
  onError,
}: {
  card: Card;
  setId: string;
  editing: boolean;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [pending, startTransition] = useTransition();

  const src = previewUrl ?? (removed ? null : cardImageUrl(card.image_path));

  function pick(file: File | null) {
    if (!file) return;
    onError("");
    setRemoved(false);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    startTransition(async () => {
      try {
        await uploadCardImage(card.id, setId, file);
      } catch (err) {
        setPreviewUrl(null);
        onError(errorMessage(err, "Couldn't upload that photo. Try again."));
      }
    });
  }

  function remove() {
    onError("");
    setPreviewUrl(null);
    setRemoved(true);
    startTransition(async () => {
      try {
        await removeCardImage(card.id, setId);
      } catch (err) {
        setRemoved(false);
        onError(errorMessage(err, "Couldn't remove that photo. Try again."));
      }
    });
  }

  const { isOver, dropHandlers } = useImageDrop(pick);

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
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={src ? "Replace photo" : "Add or drop a photo"}
        {...dropHandlers}
        className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border transition sm:h-20 sm:w-20 ${
          isOver
            ? "border-rose-400 bg-rose-50"
            : src
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
      </button>
      {src ? (
        <button
          type="button"
          onClick={remove}
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
  onDeleted,
  onError,
}: {
  card: Card;
  setId: string;
  onDeleted: (cardId: string) => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [term, setTerm] = useState(card.term);
  const [definition, setDefinition] = useState(card.definition);
  const [pending, startTransition] = useTransition();
  const ghost = isGhost(card.id);

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

  if (editing) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-900/20 p-2">
        <CardImageControl card={card} setId={setId} editing onError={onError} />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="w-full min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rose-400"
        />
        <input
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="w-full min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rose-400"
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
          className="shrink-0 rounded-md px-2 py-1.5 text-xs text-amber-950/50 hover:bg-orange-100/70"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-amber-900/10 p-4 transition sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${ghost ? "opacity-50" : ""}`}
    >
      <CardImageControl card={card} setId={setId} editing={false} onError={onError} />
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 sm:gap-4">
        <p className="whitespace-pre-wrap break-words text-base font-medium">{card.term}</p>
        <p className="whitespace-pre-wrap break-words text-base text-amber-950/60">
          {card.definition}
        </p>
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
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-900/20 p-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Add or drop a photo"
        {...dropHandlers}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition ${
          isOver
            ? "border-rose-400 bg-rose-50 text-rose-500"
            : image
              ? "border-rose-300 text-rose-500"
              : "border-dashed border-amber-900/20 text-amber-950/40 hover:border-rose-300 hover:text-rose-500"
        }`}
      >
        <ImageIcon className="h-4 w-4" />
      </button>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Term"
        className="w-full min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rose-400"
      />
      <input
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="Definition"
        onKeyDown={(e) => e.key === "Enter" && submit()}
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
    onBulkAdd(preview.cards);
    setPasteText("");
    onDone();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-amber-900/20 p-3">
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
      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        onKeyDown={insertTab}
        rows={6}
        placeholder={"mitochondria\tthe powerhouse of the cell\nphotosynthesis\thow plants convert light into energy"}
        className="w-full resize-y rounded-lg border border-amber-900/20 bg-white px-3.5 py-2.5 font-mono text-sm outline-none focus:border-rose-400"
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
        <AddCardRow onAdd={onAdd} />
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
    created_at: new Date().toISOString(),
  };
}

export function CardList({ setId, cards: serverCards }: { setId: string; cards: Card[] }) {
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
            onDeleted={handleDeleted}
            onError={(msg) => setError(msg || null)}
          />
        ))}
      </div>
    </div>
  );
}
