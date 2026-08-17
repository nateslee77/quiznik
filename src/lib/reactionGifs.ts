// Gif "banks" for mascot reactions — any gif can go in a bank as long as it
// matches the mood (happy for a correct answer / celebrating, sad for a
// wrong one). One is picked at random each time the reaction fires. Add
// more by dropping a file in public/ and appending its path here.
export const HAPPY_REACTION_GIFS: string[] = ["/mascot%20happy1.gif", "/mascot%20happy2.gif"];

export const SAD_REACTION_GIFS: string[] = ["/mascot%20sad1.gif", "/mascot%20sad2.gif"];

export function pickRandom(gifs: string[]): string | undefined {
  if (gifs.length === 0) return undefined;
  return gifs[Math.floor(Math.random() * gifs.length)];
}
