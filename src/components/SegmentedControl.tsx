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
    <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === option.value
              ? "bg-indigo-500 text-white shadow-sm"
              : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
