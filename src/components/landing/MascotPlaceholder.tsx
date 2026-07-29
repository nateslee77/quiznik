import { findSkin } from "@/lib/mascotSkins";

export type MascotState = "idle" | "testing" | "correct" | "wrong" | "celebrate";

// Reaction gifs are universal regardless of equipped skin (the skins
// supplied so far are alternate idle looks, not full reaction sets).
const REACTION_GIFS: Partial<Record<MascotState, string>> = {
  correct: "/mascot%20correct.gif",
  wrong: "/mascot%20wrong.gif",
  celebrate: "/mascot%20celebrate.gif",
};

export function MascotPlaceholder({
  variant = "idle",
  skinId = "default",
  className = "",
}: {
  variant?: MascotState;
  skinId?: string;
  className?: string;
}) {
  const src = REACTION_GIFS[variant] ?? findSkin(skinId).gif;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Quiznik mascot" className={`${className} object-contain`} />
  );
}
