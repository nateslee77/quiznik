// Original, generic placeholder mascot (an abstract rounded blob with a
// face) with a small set of emotional states. Swap this component's SVG
// for real mascot artwork/gifs later — every usage keeps the same API.
export type MascotState = "idle" | "testing" | "celebrate" | "crying";

export function MascotPlaceholder({
  variant = "idle",
  className = "",
}: {
  variant?: MascotState;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`${className} mascot-${variant}`}
      role="img"
      aria-label="Quiznik mascot"
    >
      {/* arms */}
      {variant === "celebrate" ? (
        <>
          <ellipse cx="18" cy="42" rx="9" ry="15" className="fill-amber-200" transform="rotate(-30 18 42)" />
          <ellipse cx="102" cy="42" rx="9" ry="15" className="fill-amber-200" transform="rotate(30 102 42)" />
        </>
      ) : variant === "idle" ? (
        <ellipse cx="100" cy="52" rx="9" ry="15" className="fill-amber-200" transform="rotate(25 100 52)" />
      ) : null}

      {/* body */}
      <circle cx="60" cy="64" r="46" className="fill-amber-200" />

      {/* face by state */}
      {variant === "celebrate" ? (
        <>
          <path d="M40 56 Q46 48 52 56" className="stroke-amber-950" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M68 56 Q74 48 80 56" className="stroke-amber-950" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M44 72 Q60 90 76 72" className="stroke-amber-950" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="32" cy="68" r="5" className="fill-rose-300/70" />
          <circle cx="88" cy="68" r="5" className="fill-rose-300/70" />
        </>
      ) : variant === "crying" ? (
        <>
          <path d="M41 58 L51 54" className="stroke-amber-950" strokeWidth="4" strokeLinecap="round" />
          <path d="M79 58 L69 54" className="stroke-amber-950" strokeWidth="4" strokeLinecap="round" />
          <path d="M46 80 Q60 70 74 80" className="stroke-amber-950" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M46 62 q-3 8 0 12 q4 -2 3 -10 Z" className="fill-sky-400" />
          <path d="M74 62 q3 8 0 12 q-4 -2 -3 -10 Z" className="fill-sky-400" />
        </>
      ) : variant === "testing" ? (
        <>
          <circle cx="46" cy="58" r="4.5" className="fill-amber-950" />
          <circle cx="74" cy="58" r="4.5" className="fill-amber-950" />
          <path d="M38 48 L54 46" className="stroke-amber-950" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M82 48 L66 46" className="stroke-amber-950" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M50 78 L70 78" className="stroke-amber-950" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="46" cy="58" r="4.5" className="fill-amber-950" />
          <circle cx="74" cy="58" r="4.5" className="fill-amber-950" />
          <path d="M46 76 Q60 86 74 76" className="stroke-amber-950" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="34" cy="68" r="4" className="fill-rose-300/70" />
          <circle cx="86" cy="68" r="4" className="fill-rose-300/70" />
        </>
      )}
    </svg>
  );
}
