export function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dist[i][0] = i;
  for (let j = 0; j < cols; j++) dist[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost,
      );
    }
  }

  return dist[rows - 1][cols - 1];
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

export type MatchQuality = "exact" | "close" | "wrong";

// Case/punctuation/whitespace-insensitive, and tolerant of a small typo:
// allowed edit distance scales with answer length so short answers stay
// strict. Distinguishes an exact match from a merely-close one so callers
// can decide whether to ask "did you mean X?" before grading it correct.
export function matchQuality(userAnswer: string, correctAnswer: string): MatchQuality {
  const normalizedUser = normalize(userAnswer);
  const normalizedCorrect = normalize(correctAnswer);

  if (normalizedUser === normalizedCorrect) return "exact";
  if (!normalizedUser) return "wrong";

  const threshold = normalizedCorrect.length <= 5 ? 1 : 2;
  return levenshtein(normalizedUser, normalizedCorrect) <= threshold ? "close" : "wrong";
}

export function isCloseEnough(userAnswer: string, correctAnswer: string): boolean {
  return matchQuality(userAnswer, correctAnswer) !== "wrong";
}
