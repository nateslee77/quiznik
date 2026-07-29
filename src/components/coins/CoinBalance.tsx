"use client";

import { useCoins } from "@/components/coins/CoinsContext";
import { CoinIcon } from "@/components/icons";

export function CoinBalance({ className = "" }: { className?: string }) {
  const { balance } = useCoins();
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800 ${className}`}
    >
      <CoinIcon className="h-4 w-4" />
      {balance}
    </div>
  );
}
