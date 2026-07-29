"use client";

import { createContext, useContext, useState } from "react";

type CoinsContextValue = {
  balance: number;
  addCoins: (amount: number) => void;
};

// Safe no-op default so components using the hook never crash when
// rendered outside the provider (e.g. logged-out pages).
const CoinsContext = createContext<CoinsContextValue>({
  balance: 0,
  addCoins: () => {},
});

export function CoinsProvider({
  initialBalance = 0,
  children,
}: {
  initialBalance?: number;
  children: React.ReactNode;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const addCoins = (amount: number) => setBalance((b) => b + amount);
  return (
    <CoinsContext.Provider value={{ balance, addCoins }}>{children}</CoinsContext.Provider>
  );
}

export function useCoins() {
  return useContext(CoinsContext);
}
