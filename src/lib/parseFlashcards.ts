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

export type ParsedCard = { term: string; definition: string };

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
