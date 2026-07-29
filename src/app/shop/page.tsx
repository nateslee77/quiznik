import { createClient } from "@/lib/supabase/server";
import { MASCOT_SKINS } from "@/lib/mascotSkins";
import { CoinBalance } from "@/components/coins/CoinBalance";
import { MascotPlaceholder } from "@/components/landing/MascotPlaceholder";
import { ShopSkinCard } from "@/components/shop/ShopSkinCard";

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let ownedSkinIds = new Set<string>(["default"]);

  if (user) {
    const { data } = await supabase.from("unlocked_skins").select("skin_id").eq("user_id", user.id);
    ownedSkinIds = new Set(["default", ...(data ?? []).map((r) => r.skin_id)]);
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MascotPlaceholder variant="celebrate" className="h-12 w-12" />
          <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
        </div>
        <CoinBalance />
      </div>
      <p className="mb-8 text-sm text-amber-950/50">
        Spend coins earned from Learn and Test on a new look for your study buddy.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MASCOT_SKINS.map((skin) => (
          <ShopSkinCard key={skin.id} skin={skin} initiallyOwned={ownedSkinIds.has(skin.id)} />
        ))}
      </div>
    </div>
  );
}
