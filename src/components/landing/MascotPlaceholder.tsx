// Original, generic placeholder mascot (an abstract rounded blob with a
// face) so the landing page has a friendly focal point without depending
// on any third-party character art. Swap this component's markup out for
// real mascot artwork later — every usage below stays the same.
export function MascotPlaceholder({
  variant = "wave",
  className = "",
}: {
  variant?: "wave" | "happy";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="Quiznik mascot"
    >
      {variant === "wave" ? (
        <ellipse
          cx="98"
          cy="52"
          rx="10"
          ry="16"
          className="fill-amber-200 dark:fill-amber-300/30"
          transform="rotate(25 98 52)"
        />
      ) : null}

      <circle cx="60" cy="64" r="46" className="fill-amber-200 dark:fill-amber-300/30" />

      {variant === "happy" ? (
        <>
          <path d="M40 56 Q46 48 52 56" className="stroke-neutral-900 dark:stroke-white" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M68 56 Q74 48 80 56" className="stroke-neutral-900 dark:stroke-white" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M44 72 Q60 88 76 72" className="stroke-neutral-900 dark:stroke-white" strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="46" cy="58" r="4.5" className="fill-neutral-900 dark:fill-white" />
          <circle cx="74" cy="58" r="4.5" className="fill-neutral-900 dark:fill-white" />
          <path d="M46 76 Q60 86 74 76" className="stroke-neutral-900 dark:stroke-white" strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      )}
    </svg>
  );
}
