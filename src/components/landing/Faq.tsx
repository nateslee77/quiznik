const FAQS = [
  {
    question: "Is Quiznik free?",
    answer: "Yes — creating sets, studying, testing, and Learn mode are all free.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your sets and cards are stored in your own account and locked down with row-level security, so only you can read or edit them.",
  },
  {
    question: "Can I import notes I already have?",
    answer:
      "Yes. Paste text formatted as term/definition pairs (tab, comma, dash, or colon separated) and Quiznik builds the cards for you.",
  },
  {
    question: "What does Learn mode do differently from Study or Test?",
    answer:
      "It tracks each card individually: multiple choice first, written recall once you've got it, and a schedule that brings cards back more often when you get them wrong.",
  },
  {
    question: "Do I need an account?",
    answer: "Yes — an account is what keeps your sets saved and private to you across devices.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-4 py-16">
      <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="mt-8 flex flex-col gap-2">
        {FAQS.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <summary className="cursor-pointer list-none text-sm font-medium marker:content-none">
              <span className="flex items-center justify-between gap-4">
                {faq.question}
                <span className="text-neutral-400 transition group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
