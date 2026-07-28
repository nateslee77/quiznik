"use client";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-amber-200/50 p-1 dark:bg-neutral-900">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === option.value
              ? "bg-rose-400 text-white shadow-sm"
              : "text-amber-950/50 dark:text-amber-950/60"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
