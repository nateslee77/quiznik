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
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// Case/whitespace-insensitive, and tolerant of a small typo: allowed edit
// distance scales with answer length so short answers stay strict.
export function isCloseEnough(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUser = normalize(userAnswer);
  const normalizedCorrect = normalize(correctAnswer);

  if (normalizedUser === normalizedCorrect) return true;
  if (!normalizedUser) return false;

  const threshold = normalizedCorrect.length <= 5 ? 1 : 2;
  return levenshtein(normalizedUser, normalizedCorrect) <= threshold;
}
