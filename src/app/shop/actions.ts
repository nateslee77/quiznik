"use server";

import { createClient } from "@/lib/supabase/server";
import { getCoinBalance } from "@/lib/coins";
import { findSkin } from "@/lib/mascotSkins";

export async function purchaseSkin(skinId: string) {
  const skin = findSkin(skinId);
  if (skin.id !== skinId) throw new Error("Unknown skin.");
  if (skin.price === 0) return; // "default" — nothing to buy

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: existing } = await supabase
    .from("unlocked_skins")
    .select("skin_id")
    .eq("user_id", user.id)
    .eq("skin_id", skinId)
    .maybeSingle();
  if (existing) return; // already owned

  const balance = await getCoinBalance(supabase, user.id);
  if (balance < skin.price) {
    throw new Error("Not enough coins.");
  }

  // Two sequential inserts, not an atomic DB transaction — acceptable at
  // this scale. Worst case on a failure between the two is a free unlock,
  // not a lost purchase.
  const { error: unlockError } = await supabase
    .from("unlocked_skins")
    .insert({ user_id: user.id, skin_id: skinId });
  if (unlockError) throw new Error(unlockError.message);

  const { error: chargeError } = await supabase.from("coin_transactions").insert({
    user_id: user.id,
    amount: -skin.price,
    reason: "shop_purchase",
  });
  if (chargeError) throw new Error(chargeError.message);
}

export async function equipSkin(skinId: string) {
  const skin = findSkin(skinId);
  if (skin.id !== skinId) throw new Error("Unknown skin.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  if (skin.price > 0) {
    const { data: owned } = await supabase
      .from("unlocked_skins")
      .select("skin_id")
      .eq("user_id", user.id)
      .eq("skin_id", skinId)
      .maybeSingle();
    if (!owned) throw new Error("Skin not unlocked yet.");
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, equipped_skin: skinId }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
