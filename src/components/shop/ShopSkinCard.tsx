"use client";

import { useState, useTransition } from "react";
import { purchaseSkin, equipSkin } from "@/app/shop/actions";
import { useMascot } from "@/components/mascot/MascotContext";
import { useCoins } from "@/components/coins/CoinsContext";
import type { MascotSkin } from "@/lib/mascotSkins";

export function ShopSkinCard({
  skin,
  initiallyOwned,
}: {
  skin: MascotSkin;
  initiallyOwned: boolean;
}) {
  const [owned, setOwned] = useState(initiallyOwned);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { skinId, setSkinId } = useMascot();
  const { balance, addCoins } = useCoins();
  const equipped = skinId === skin.id;

  function buy() {
    if (owned || balance < skin.price) return;
    setError(null);
    setOwned(true);
    addCoins(-skin.price);
    startTransition(async () => {
      try {
        await purchaseSkin(skin.id);
      } catch (e) {
        setOwned(false);
        addCoins(skin.price);
        setError(e instanceof Error ? e.message : "Purchase failed.");
      }
    });
  }

  function equip() {
    if (!owned || equipped) return;
    setError(null);
    setSkinId(skin.id);
    startTransition(async () => {
      try {
        await equipSkin(skin.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't equip.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-900/10 bg-white p-4 text-center">
      {equipped ? (
        <span className="self-end rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-500">
          Equipped
        </span>
      ) : (
        <span className="self-end text-[10px] text-transparent">.</span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={skin.gif} alt={skin.name} className="h-16 w-16 object-contain" />
      <p className="text-sm font-semibold">{skin.name}</p>

      {equipped ? (
        <span className="mt-1 text-xs text-amber-950/40">Current look</span>
      ) : owned ? (
        <button
          onClick={equip}
          className="mt-1 rounded-lg bg-rose-400 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-300"
        >
          Equip
        </button>
      ) : (
        <button
          onClick={buy}
          disabled={balance < skin.price}
          className="mt-1 rounded-full bg-amber-200/70 px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 disabled:opacity-50"
        >
          {skin.price} coins
        </button>
      )}

      {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
    </div>
  );
}
