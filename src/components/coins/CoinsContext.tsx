"use client";

import { createContext, useContext, useRef, useState } from "react";

export type CoinPopup = { id: number; amount: number };

type CoinsContextValue = {
  balance: number;
  addCoins: (amount: number) => void;
  popups: CoinPopup[];
};

// Safe no-op default so components using the hook never crash when
// rendered outside the provider (e.g. logged-out pages).
const CoinsContext = createContext<CoinsContextValue>({
  balance: 0,
  addCoins: () => {},
  popups: [],
});

const POPUP_LIFETIME_MS = 900;

export function CoinsProvider({
  initialBalance = 0,
  children,
}: {
  initialBalance?: number;
  children: React.ReactNode;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [popups, setPopups] = useState<CoinPopup[]>([]);
  const nextId = useRef(0);

  function addCoins(amount: number) {
    if (amount === 0) return;
    setBalance((b) => b + amount);
    const id = nextId.current++;
    setPopups((prev) => [...prev, { id, amount }]);
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    }, POPUP_LIFETIME_MS);
  }

  return (
    <CoinsContext.Provider value={{ balance, addCoins, popups }}>{children}</CoinsContext.Provider>
  );
}

export function useCoins() {
  return useContext(CoinsContext);
}
