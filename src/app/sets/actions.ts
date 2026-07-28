"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ParsedCard } from "@/lib/parseFlashcards";

export type CreateSetState = { error: string };

export async function createSet(
  _prevState: CreateSetState,
  formData: FormData,
): Promise<CreateSetState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const cardsJson = String(formData.get("cards") ?? "[]");

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

  const { data: set, error: setError } = await supabase
    .from("sets")
    .insert({ title, description: description || null, user_id: user.id })
    .select("id")
    .single();

  if (setError || !set) {
    return { error: setError?.message ?? "Couldn't create the set." };
  }

  const { error: cardsError } = await supabase.from("cards").insert(
    validCards.map((card, i) => ({
      set_id: set.id,
      term: card.term.trim(),
      definition: card.definition.trim(),
      position: i,
    })),
  );

  if (cardsError) {
    return { error: cardsError.message };
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

  const { error } = await supabase.from("cards").insert({
    set_id: setId,
    term: term.trim(),
    definition: definition.trim(),
    position: count ?? 0,
  });
  if (error) throw new Error(error.message);
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
  const { error } = await supabase.from("cards").delete().eq("id", cardId);
  if (error) throw new Error(error.message);
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

export async function createFolder(name: string) {
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
    .insert({ name: trimmed, user_id: user.id, position: count ?? 0 });
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
