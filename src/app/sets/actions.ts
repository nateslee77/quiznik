"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ParsedCard } from "@/lib/parseFlashcards";
import { TEST_CORRECT_COINS, testCompletionBonus } from "@/lib/coins";
import { CARD_IMAGES_BUCKET } from "@/lib/supabase/storage";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function extOf(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/")[1] ?? "jpg";
}

async function uploadCardImageFile(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${extOf(file)}`;
  const { error } = await supabase.storage.from(CARD_IMAGES_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return path;
}

export type CreateSetState = { error: string };

export async function createSet(
  _prevState: CreateSetState,
  formData: FormData,
): Promise<CreateSetState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const cardsJson = String(formData.get("cards") ?? "[]");
  const requestedFolderId = String(formData.get("folder_id") ?? "").trim() || null;

  if (!title) {
    return { error: "Give your set a title." };
  }

  let cards: ParsedCard[];
  try {
    cards = JSON.parse(cardsJson);
  } catch {
    return { error: "Something went wrong reading your cards." };
  }

  const validCards = cards.filter((c) => c.term?.trim() && c.definition?.trim());
  if (validCards.length === 0) {
    return { error: "Add at least one card with a term and definition." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Only honor the folder if it exists and is visible to this user (RLS
  // scopes the lookup, so a foreign id resolves to null).
  let folderId: string | null = null;
  if (requestedFolderId) {
    const { data: folder } = await supabase
      .from("folders")
      .select("id")
      .eq("id", requestedFolderId)
      .maybeSingle();
    folderId = folder?.id ?? null;
  }

  const { data: set, error: setError } = await supabase
    .from("sets")
    .insert({ title, description: description || null, user_id: user.id, folder_id: folderId })
    .select("id")
    .single();

  if (setError || !set) {
    return { error: setError?.message ?? "Couldn't create the set." };
  }

  const { data: insertedCards, error: cardsError } = await supabase
    .from("cards")
    .insert(
      validCards.map((card, i) => ({
        set_id: set.id,
        term: card.term.trim(),
        definition: card.definition.trim(),
        position: i,
      })),
    )
    .select("id, position")
    .order("position", { ascending: true });

  if (cardsError) {
    return { error: cardsError.message };
  }

  // Attach any per-row images picked in the manual-entry form. Bulk insert
  // doesn't guarantee return order matches input order, so match rows back
  // up by the `position` we just assigned rather than array index.
  const uploads = (insertedCards ?? []).flatMap((row) => {
    const source = validCards[row.position];
    const file = source?.id ? formData.get(`image-${source.id}`) : null;
    if (!(file instanceof File) || file.size === 0) return [];
    return [{ cardId: row.id, file }];
  });

  if (uploads.length > 0) {
    await Promise.all(
      uploads.map(async ({ cardId, file }) => {
        if (file.size > MAX_IMAGE_BYTES || !file.type.startsWith("image/")) return;
        try {
          const path = await uploadCardImageFile(supabase, user.id, file);
          await supabase.from("cards").update({ image_path: path }).eq("id", cardId);
        } catch (err) {
          // A failed image upload shouldn't block set creation — the card
          // still exists, the user can attach a photo again from the deck.
          // Logged (not surfaced) since we're about to redirect away from
          // any UI that could show it.
          console.error(`Card image upload failed for card ${cardId}:`, err);
        }
      }),
    );
  }

  revalidatePath("/sets");
  redirect(`/sets/${set.id}`);
}

export async function deleteSet(setId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sets").delete().eq("id", setId);
  if (error) throw new Error(error.message);
  revalidatePath("/sets");
  redirect("/sets");
}

export async function updateSetDetails(
  setId: string,
  title: string,
  description: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sets")
    .update({ title: title.trim(), description: description.trim() || null })
    .eq("id", setId);
  if (error) throw new Error(error.message);
  revalidatePath(`/sets/${setId}`);
  revalidatePath("/sets");
}

export async function addCard(setId: string, term: string, definition: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("set_id", setId);

  const { data: card, error } = await supabase
    .from("cards")
    .insert({
      set_id: setId,
      term: term.trim(),
      definition: definition.trim(),
      position: count ?? 0,
    })
    .select("id")
    .single();
  if (error || !card) throw new Error(error?.message ?? "Couldn't add the card.");
  revalidatePath(`/sets/${setId}`);
  return { id: card.id as string };
}

export async function uploadCardImage(cardId: string, setId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be under 5MB.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("cards")
    .select("image_path")
    .eq("id", cardId)
    .maybeSingle();

  const path = await uploadCardImageFile(supabase, user.id, file);
  const { error } = await supabase.from("cards").update({ image_path: path }).eq("id", cardId);
  if (error) throw new Error(error.message);

  if (existing?.image_path) {
    await supabase.storage.from(CARD_IMAGES_BUCKET).remove([existing.image_path]);
  }
  revalidatePath(`/sets/${setId}`);
  return { path };
}

export async function removeCardImage(cardId: string, setId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("cards")
    .select("image_path")
    .eq("id", cardId)
    .maybeSingle();

  const { error } = await supabase.from("cards").update({ image_path: null }).eq("id", cardId);
  if (error) throw new Error(error.message);

  if (existing?.image_path) {
    await supabase.storage.from(CARD_IMAGES_BUCKET).remove([existing.image_path]);
  }
  revalidatePath(`/sets/${setId}`);
}

export async function updateCard(
  cardId: string,
  setId: string,
  term: string,
  definition: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .update({ term: term.trim(), definition: definition.trim() })
    .eq("id", cardId);
  if (error) throw new Error(error.message);
  revalidatePath(`/sets/${setId}`);
}

export async function deleteCard(cardId: string, setId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("cards")
    .select("image_path")
    .eq("id", cardId)
    .maybeSingle();

  const { error } = await supabase.from("cards").delete().eq("id", cardId);
  if (error) throw new Error(error.message);

  if (existing?.image_path) {
    await supabase.storage.from(CARD_IMAGES_BUCKET).remove([existing.image_path]);
  }
  revalidatePath(`/sets/${setId}`);
}

export async function addCardsBulk(setId: string, cards: ParsedCard[]) {
  const validCards = cards.filter((c) => c.term?.trim() && c.definition?.trim());
  if (validCards.length === 0) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("set_id", setId);

  const base = count ?? 0;
  const { error } = await supabase.from("cards").insert(
    validCards.map((card, i) => ({
      set_id: setId,
      term: card.term.trim(),
      definition: card.definition.trim(),
      position: base + i,
    })),
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/sets/${setId}`);
}

export async function resetStudyProgress(setId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("study_progress").delete().eq("set_id", setId);
  if (error) throw new Error(error.message);
  revalidatePath(`/sets/${setId}/learn`);
}

export async function createFolder(name: string, parentId: string | null = null) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("folders")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase
    .from("folders")
    .insert({ name: trimmed, user_id: user.id, parent_id: parentId, position: count ?? 0 });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function renameFolder(folderId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const supabase = await createClient();
  const { error } = await supabase.from("folders").update({ name: trimmed }).eq("id", folderId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteFolder(folderId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("folders").delete().eq("id", folderId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function moveSetToFolder(setId: string, folderId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("sets").update({ folder_id: folderId }).eq("id", setId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function awardTestCoins(setId: string, correctCount: number, totalQuestions: number) {
  if (totalQuestions <= 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const amount =
    correctCount * TEST_CORRECT_COINS + testCompletionBonus(correctCount / totalQuestions);
  if (amount <= 0) return;

  const { error } = await supabase.from("coin_transactions").insert({
    user_id: user.id,
    amount,
    reason: "test_complete",
    set_id: setId,
  });
  if (error) throw new Error(error.message);
}

export async function moveFolder(folderId: string, newParentId: string | null) {
  if (folderId === newParentId) return;

  const supabase = await createClient();

  // Reject moves that would create a cycle (dropping a folder into its own
  // subtree). Walk up from the target until the root.
  if (newParentId) {
    const { data: folders } = await supabase.from("folders").select("id, parent_id");
    const parentById = new Map((folders ?? []).map((f) => [f.id as string, f.parent_id as string | null]));
    let cursor: string | null = newParentId;
    while (cursor) {
      if (cursor === folderId) return;
      cursor = parentById.get(cursor) ?? null;
    }
  }

  const { error } = await supabase
    .from("folders")
    .update({ parent_id: newParentId })
    .eq("id", folderId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
