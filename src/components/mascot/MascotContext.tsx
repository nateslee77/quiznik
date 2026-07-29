"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { MascotPlaceholder, type MascotState } from "@/components/landing/MascotPlaceholder";

type MascotContextValue = {
  state: MascotState;
  setState: (state: MascotState) => void;
  skinId: string;
  setSkinId: (skinId: string) => void;
};

// Safe no-op default so components using the hook never crash when
// rendered outside the provider (e.g. logged-out pages).
const MascotContext = createContext<MascotContextValue>({
  state: "idle",
  setState: () => {},
  skinId: "default",
  setSkinId: () => {},
});

export function MascotProvider({
  initialSkinId = "default",
  children,
}: {
  initialSkinId?: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<MascotState>("idle");
  const [skinId, setSkinId] = useState(initialSkinId);
  return (
    <MascotContext.Provider value={{ state, setState, skinId, setSkinId }}>
      {children}
    </MascotContext.Provider>
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
// Matches AppShell's mobile top bar (`h-14`), which only renders below the
// `lg` breakpoint (1024px) — the mascot must never sit under it.
const MOBILE_HEADER_HEIGHT = 56;
const LG_BREAKPOINT = 1024;

function getTopInset(): number {
  if (typeof window === "undefined") return 0;
  return window.innerWidth < LG_BREAKPOINT ? MOBILE_HEADER_HEIGHT : 0;
}

function clampPos(x: number, y: number): { x: number; y: number } {
  const topInset = getTopInset();
  return {
    x: Math.min(Math.max(0, x), window.innerWidth - MASCOT_SIZE),
    y: Math.min(Math.max(topInset, y), window.innerHeight - MASCOT_SIZE),
  };
}

// The always-visible companion. Drag it anywhere; the spot is remembered.
export function DockedMascot() {
  const { state, skinId } = useMascot();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(MASCOT_POS_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return clampPos(parsed.x, parsed.y);
    } catch {
      return null;
    }
  });
  const [dragging, setDragging] = useState(false);

  // Re-clamp on viewport resize (e.g. rotating a phone, or the mobile top
  // bar appearing/disappearing at the lg breakpoint) so a saved spot from
  // one layout can't end up under the header in another.
  useEffect(() => {
    function onResize() {
      setPos((prev) => (prev ? clampPos(prev.x, prev.y) : prev));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;
    setDragging(true);

    function onMove(ev: PointerEvent) {
      setPos(clampPos(ev.clientX - offsetX, ev.clientY - offsetY));
    }
    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(false);
      const finalPos = clampPos(ev.clientX - offsetX, ev.clientY - offsetY);
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
      <MascotPlaceholder
        variant={state}
        skinId={skinId}
        className="h-16 w-16 drop-shadow-md sm:h-20 sm:w-20"
      />
    </div>
  );
}
