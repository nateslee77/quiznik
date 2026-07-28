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

const MASCOT_POS_KEY = "quiznik-mascot-pos";
const MASCOT_SIZE = 80;

// The always-visible companion. Drag it anywhere; the spot is remembered.
export function DockedMascot() {
  const { state } = useMascot();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(MASCOT_POS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [dragging, setDragging] = useState(false);

  function clamp(x: number, y: number) {
    return {
      x: Math.min(Math.max(0, x), window.innerWidth - MASCOT_SIZE),
      y: Math.min(Math.max(0, y), window.innerHeight - MASCOT_SIZE),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;
    setDragging(true);

    function onMove(ev: PointerEvent) {
      setPos(clamp(ev.clientX - offsetX, ev.clientY - offsetY));
    }
    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(false);
      const finalPos = clamp(ev.clientX - offsetX, ev.clientY - offsetY);
      setPos(finalPos);
      try {
        localStorage.setItem(MASCOT_POS_KEY, JSON.stringify(finalPos));
      } catch {
        // storage unavailable — position just won't persist
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      suppressHydrationWarning
      onPointerDown={onPointerDown}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      className={`fixed z-20 touch-none select-none ${
        pos ? "" : "bottom-3 right-3 sm:bottom-5 sm:right-5"
      } ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <MascotPlaceholder variant={state} className="h-16 w-16 drop-shadow-md sm:h-20 sm:w-20" />
    </div>
  );
}
