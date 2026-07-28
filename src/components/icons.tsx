export function GearIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.6 2.6" />
    </svg>
  );
}
