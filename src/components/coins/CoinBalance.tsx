"use client";

import { useCoins } from "@/components/coins/CoinsContext";
import { CoinIcon } from "@/components/icons";

export function CoinBalance({ className = "" }: { className?: string }) {
  const { balance, popups } = useCoins();
  return (
    <div className={`relative inline-flex ${className}`}>
      <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
        <CoinIcon className="h-4 w-4" />
        {balance}
      </div>
      {popups.map((p) => (
        <span
          key={p.id}
          aria-hidden
          className="coin-pop pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-sm font-bold text-emerald-600"
        >
          {p.amount > 0 ? `+${p.amount}` : p.amount}
        </span>
      ))}
    </div>
  );
}
