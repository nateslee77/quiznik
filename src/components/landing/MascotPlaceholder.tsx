"use client";

import { useState } from "react";
import { findSkin } from "@/lib/mascotSkins";
import { HAPPY_REACTION_GIFS, SAD_REACTION_GIFS, pickRandom } from "@/lib/reactionGifs";

export type MascotState = "idle" | "testing" | "correct" | "wrong" | "celebrate";

// "correct"/"celebrate" draw from the happy bank, "wrong" from the sad
// bank — a random pick each time, not a fixed asset per state.
function reactionGifFor(variant: MascotState): string | undefined {
  if (variant === "correct" || variant === "celebrate") return pickRandom(HAPPY_REACTION_GIFS);
  if (variant === "wrong") return pickRandom(SAD_REACTION_GIFS);
  return undefined;
}

export function MascotPlaceholder({
  variant = "idle",
  skinId = "default",
  className = "",
}: {
  variant?: MascotState;
  skinId?: string;
  className?: string;
}) {
  const fallback = findSkin(skinId).gif;

  // Re-roll only when the variant or equipped skin actually changes, not
  // on every re-render (the surrounding UI re-renders a lot while a
  // reaction is showing) — the "compare during render" pattern used
  // elsewhere in this app for "sync state from a changed prop". Falls
  // back to the equipped skin's gif for idle/testing, and also at runtime
  // via onError if a bank gif ever 404s.
  const key = `${variant}:${skinId}`;
  const [prevKey, setPrevKey] = useState(key);
  const [src, setSrc] = useState(() => reactionGifFor(variant) ?? fallback);
  if (key !== prevKey) {
    setPrevKey(key);
    setSrc(reactionGifFor(variant) ?? fallback);
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Quiznik mascot"
      className={`${className} object-contain`}
      onError={() => setSrc((current) => (current === fallback ? current : fallback))}
    />
  );
}
