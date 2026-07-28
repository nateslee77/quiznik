const FEATURES = [
  {
    title: "Paste your notes",
    description:
      "Drop in text formatted as term / definition pairs and Quiznik turns it into a full flashcard set in seconds.",
  },
  {
    title: "Learn mode that adapts",
    description:
      "Cards start as multiple choice and graduate to written recall once you know them, on a spaced-repetition schedule.",
  },
  {
    title: "Test yourself",
    description:
      "Auto-generated multiple-choice tests with a results screen that flags exactly which cards to review again.",
  },
];

export function FeatureCards() {
  return (
    <section id="features" className="mx-auto w-full max-w-5xl px-4 py-16">
      <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        How Quiznik helps you
      </h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h3 className="font-medium">{feature.title}</h3>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {feature.description}
            </p>
          </div>
        ))}

        <div className="relative rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
          <span className="absolute right-4 top-4 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
            Coming soon
          </span>
          <h3 className="font-medium text-neutral-500 dark:text-neutral-400">
            AI-assisted flashcards
          </h3>
          <p className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">
            Generate a full set from a topic or a longer document automatically. In the works.
          </p>
        </div>
      </div>
    </section>
  );
}
