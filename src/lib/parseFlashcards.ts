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

// Each non-empty line becomes one card, split into term/definition on the
// FIRST occurrence of the chosen separator, so definitions may safely
// contain the separator character again.
export function parseFlashcardText(
  text: string,
  separator: TermSeparator,
): ParseResult {
  const token = SEPARATOR_TOKENS[separator];
  const lines = text.split(/\r?\n/).map((line) => line.trim());
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
  const blocks = text
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const cards: ParsedCard[] = [];
  let skipped = 0;

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const [term, ...optionLines] = lines;
    const options = optionLines
      .map((line) => ({ text: line.replace(/^\*\s*/, "").trim(), marked: line.startsWith("*") }))
      .filter((o) => o.text);

    if (!term || options.length === 0) {
      skipped += 1;
      continue;
    }

    const correct = options.find((o) => o.marked) ?? options[0];
    const distractors = options.filter((o) => o !== correct).map((o) => o.text);

    cards.push({ term, definition: correct.text, distractors: distractors.length ? distractors : undefined });
  }

  return { cards, skipped };
}
