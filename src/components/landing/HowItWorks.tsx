const STEPS = [
  {
    step: "1",
    title: "Create",
    description: "Type cards by hand or paste a block of term/definition text and import it all at once.",
  },
  {
    step: "2",
    title: "Learn",
    description: "Work through multiple choice, then written recall, at a pace that adjusts to each card.",
  },
  {
    step: "3",
    title: "Master",
    description: "Take a test, review what you missed, and watch cards move from new to mastered.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-neutral-100/60 py-16 dark:bg-neutral-900/40">
      <div className="mx-auto w-full max-w-5xl px-4">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          How it works
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
                {s.step}
              </div>
              <h3 className="mt-3 font-medium">{s.title}</h3>
              <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
