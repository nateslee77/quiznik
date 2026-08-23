"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { MascotPlaceholder, type MascotState } from "@/components/landing/MascotPlaceholder";
import { useMascotEnabled } from "@/lib/mascotSettings";

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
// Fallback used only before the widget's real size can be measured (the
// very first paint) — actual clamping below measures the live DOM instead
// of a hardcoded guess, since the mascot's rendered size varies by
// breakpoint (globals.css scales the whole UI differently on phones vs
// desktop) and swells considerably during a correct/wrong reaction.
const FALLBACK_SIZE = 96;

const REACTION_HOLD_MS = 3000;
const REACTION_FADE_MS = 400;

// Keeps a correct/wrong reaction on screen for a fixed 3s from the moment
// it starts, even if the caller moves on (e.g. clicking "Next") and sets
// the context state back to "testing" well before that — the hold timer
// deliberately outlives whatever `state` does in the meantime, then reveals
// whatever the latest state has become, fading in between.
function useHeldMascotState(state: MascotState): { displayState: MascotState; fading: boolean } {
  const [displayState, setDisplayState] = useState(state);
  const [fading, setFading] = useState(false);
  const latestState = useRef(state);
  const holding = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestState.current = state;
  }, [state]);

  useEffect(() => {
    const isReaction = state === "correct" || state === "wrong";
    if (!isReaction) {
      if (!holding.current) setDisplayState(state);
      return;
    }
    if (holding.current) return; // a reaction is already being held — let its own timer run out

    holding.current = true;
    setFading(false);
    setDisplayState(state);

    holdTimer.current = setTimeout(() => {
      setFading(true);
      fadeTimer.current = setTimeout(() => {
        holding.current = false;
        setFading(false);
        setDisplayState(latestState.current);
      }, REACTION_FADE_MS);
    }, REACTION_HOLD_MS);
    // Deliberately no cleanup tied to `state` changes here — the whole
    // point is that this timer must survive them. Only cleared on unmount,
    // below.
  }, [state]);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  return { displayState, fading };
}

// Measures AppShell's actual mobile top bar rather than assuming a fixed
// height at a fixed breakpoint — it's `display:none` (0-height) above the
// `lg` breakpoint via `lg:hidden`, so this is naturally 0 on desktop too,
// with no separate breakpoint check needed.
function getTopInset(): number {
  if (typeof document === "undefined") return 0;
  return document.getElementById("mobile-topbar")?.getBoundingClientRect().height ?? 0;
}

function clampPos(
  x: number,
  y: number,
  width: number = FALLBACK_SIZE,
  height: number = FALLBACK_SIZE,
): { x: number; y: number } {
  const topInset = getTopInset();
  return {
    x: Math.min(Math.max(0, x), window.innerWidth - width),
    y: Math.min(Math.max(topInset, y), window.innerHeight - height),
  };
}

// The always-visible companion. Drag it anywhere; the spot is remembered.
export function DockedMascot() {
  const { state, skinId } = useMascot();
  const mascotOn = useMascotEnabled();
  const { displayState, fading } = useHeldMascotState(state);
  const isReaction = displayState === "correct" || displayState === "wrong";
  const widgetRef = useRef<HTMLDivElement>(null);
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

  // Re-clamp against the widget's *actual current* rendered size (not a
  // guess) whenever that size could have changed — on mount, on viewport
  // resize (rotating a phone, or the mobile top bar appearing/disappearing
  // at the lg breakpoint), and when a reaction grows the widget noticeably
  // bigger. A left/top-anchored drag position that fit the small idle size
  // can otherwise overflow off-screen once the reaction frame's border/
  // padding/larger image push its real footprint well past that.
  useEffect(() => {
    function reclamp() {
      const rect = widgetRef.current?.getBoundingClientRect();
      setPos((prev) => (prev && rect ? clampPos(prev.x, prev.y, rect.width, rect.height) : prev));
    }
    reclamp();
    window.addEventListener("resize", reclamp);
    return () => window.removeEventListener("resize", reclamp);
  }, [isReaction, fading]);

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;
    setDragging(true);

    function onMove(ev: PointerEvent) {
      setPos(clampPos(ev.clientX - offsetX, ev.clientY - offsetY, rect.width, rect.height));
    }
    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(false);
      const finalPos = clampPos(ev.clientX - offsetX, ev.clientY - offsetY, rect.width, rect.height);
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

  if (!mascotOn) return null;

  return (
    <div
      ref={widgetRef}
      suppressHydrationWarning
      onPointerDown={onPointerDown}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      className={`fixed z-20 touch-none select-none ${
        pos ? "" : "top-16 right-3 sm:right-5 lg:top-3"
      } ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      {isReaction ? (
        <div
          className={`rounded-2xl border-2 bg-white p-2 shadow-lg transition-opacity ${
            displayState === "correct" ? "border-emerald-400" : "border-red-400"
          } ${fading ? "opacity-0" : "opacity-100"}`}
          style={{ transitionDuration: `${REACTION_FADE_MS}ms` }}
        >
          <MascotPlaceholder variant={displayState} skinId={skinId} className="h-24 w-24 sm:h-28 sm:w-28" />
        </div>
      ) : (
        <MascotPlaceholder
          variant={displayState}
          skinId={skinId}
          className="h-16 w-16 drop-shadow-md sm:h-20 sm:w-20"
        />
      )}
    </div>
  );
}
