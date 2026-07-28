"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { MascotPlaceholder, type MascotState } from "@/components/landing/MascotPlaceholder";

type MascotContextValue = {
  state: MascotState;
  setState: (state: MascotState) => void;
};

// Safe no-op default so components using the hook never crash when
// rendered outside the provider (e.g. logged-out pages).
const MascotContext = createContext<MascotContextValue>({
  state: "idle",
  setState: () => {},
});

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MascotState>("idle");
  return (
    <MascotContext.Provider value={{ state, setState }}>{children}</MascotContext.Provider>
  );
}

export function useMascot() {
  return useContext(MascotContext);
}

// Sets the mascot to `state` while the calling component is mounted, and
// back to idle when it unmounts.
export function useMascotWhileMounted(state: MascotState) {
  const { setState } = useMascot();
  useEffect(() => {
    setState(state);
    return () => setState("idle");
  }, [state, setState]);
}

// The always-visible companion docked in the corner of the app.
export function DockedMascot() {
  const { state } = useMascot();
  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-20 sm:bottom-5 sm:right-5">
      <MascotPlaceholder variant={state} className="h-16 w-16 drop-shadow-md sm:h-20 sm:w-20" />
    </div>
  );
}
