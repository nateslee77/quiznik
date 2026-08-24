export type TermSeparator = "tab" | "comma" | "dash" | "colon";

const SEPARATOR_TOKENS: Record<TermSeparator, string> = {
  tab: "\t",
  comma: ",",
  dash: " - ",
  colon: ":",
};

export const TERM_SEPARATORS: Record<TermSeparator, { label: string }> = {
  tab: { label: "Tab" },
  comma: { label: "Comma (,)" },
  dash: { label: "Dash ( - )" },
  colon: { label: "Colon (:)" },
};

export type ParsedCard = { term: string; definition: string; distractors?: string[]; id?: string };

export type ParseResult = {
  cards: ParsedCard[];
  skipped: number;
};

// Both bulk-paste formats below are line-oriented (one card per line, or
// blank-line-separated blocks split into per-line choices) — which breaks a
// pasted ```lang\n...\n``` code fence, since the format can't tell "a
// newline inside my code" from "a newline that means start a new
// line/card". The fix: before doing any line/blank-line splitting, swap
// every real newline *inside* a fence for this sentinel (never appears in
// real text, so it can't collide), do the normal split, then swap it back
// per extracted field. The fence survives as a single opaque "line" through
// the whole split, then unfolds back into real multi-line code at the end.
const FENCE_GUARD = "\u0000";

function guardFences(text: string): string {
  return text.replace(/```[\s\S]*?```/g, (block) => block.replace(/\r?\n/g, FENCE_GUARD));
}

function unguard(text: string): string {
  return text.replaceAll(FENCE_GUARD, "\n");
}

// Each non-empty line becomes one card, split into term/definition on the
// FIRST occurrence of the chosen separator, so definitions may safely
// contain the separator character again.
export function parseFlashcardText(
  text: string,
  separator: TermSeparator,
): ParseResult {
  const token = SEPARATOR_TOKENS[separator];
  const lines = guardFences(text).split(/\r?\n/).map((line) => unguard(line).trim());
  const cards: ParsedCard[] = [];
  let skipped = 0;

  for (const line of lines) {
    if (!line) continue;

    const idx = line.indexOf(token);
    if (idx === -1) {
      skipped += 1;
      continue;
    }

    const term = line.slice(0, idx).trim();
    const definition = line.slice(idx + token.length).trim();

    if (!term || !definition) {
      skipped += 1;
      continue;
    }

    cards.push({ term, definition });
  }

  return { cards, skipped };
}

// Blocks separated by one or more blank lines. First line of a block is the
// term/prompt; remaining lines are answer choices — prefix the correct one
// with "*" (if none is marked, the first choice is treated as correct). Lets
// someone hand-author their own wrong answers instead of relying on
// randomly-drawn or AI-generated distractors.
export function parseFlashcardTextWithChoices(text: string): ParseResult {
  const blocks = guardFences(text)
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const cards: ParsedCard[] = [];
  let skipped = 0;
  // A prompt like "What is printed?" pasted directly above a fenced code
  // block, with the blank line Markdown convention puts before a fence, is
  // indistinguishable at the blank-line-split level from two separate
  // cards — it lands as its own zero-option block. Rather than drop it,
  // hold it and prepend it to whichever later block turns out to have the
  // answer choices, so the prompt and its code stay together as one card.
  let pendingPrefix = "";

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((line) => unguard(line).trim())
      .filter(Boolean);

    const [term, ...optionLines] = lines;
    const options = optionLines
      .map((line) => ({ text: line.replace(/^\*\s*/, "").trim(), marked: line.startsWith("*") }))
      .filter((o) => o.text);

    if (!term) continue;

    if (options.length === 0) {
      pendingPrefix = pendingPrefix ? `${pendingPrefix}\n${lines.join("\n")}` : lines.join("\n");
      continue;
    }

    const fullTerm = pendingPrefix ? `${pendingPrefix}\n${term}` : term;
    pendingPrefix = "";

    const correct = options.find((o) => o.marked) ?? options[0];
    const distractors = options.filter((o) => o !== correct).map((o) => o.text);

    cards.push({ term: fullTerm, definition: correct.text, distractors: distractors.length ? distractors : undefined });
  }

  if (pendingPrefix) skipped += 1;

  return { cards, skipped };
}
