export type MascotState = "idle" | "testing" | "celebrate" | "crying";

// One gif for every state for now — swap individual entries here later if
// you add per-state art (e.g. a separate crying.gif).
const MASCOT_GIF = "/mascot%20dance.gif";

export function MascotPlaceholder({
  variant = "idle",
  className = "",
}: {
  variant?: MascotState;
  className?: string;
}) {
  void variant; // unused while every state shares one gif
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={MASCOT_GIF} alt="Quiznik mascot" className={`${className} object-contain`} />
  );
}
