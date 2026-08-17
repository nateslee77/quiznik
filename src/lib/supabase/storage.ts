export const CARD_IMAGES_BUCKET = "card-images";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// The bucket is public, so the URL is a deterministic function of the
// project URL + path — no SDK call (and no auth) needed to render an image.
export function cardImageUrl(path: string | null | undefined): string | null {
  if (!path || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${CARD_IMAGES_BUCKET}/${path}`;
}
