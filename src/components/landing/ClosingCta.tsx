import Link from "next/link";

export function ClosingCta() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Ready to make your first set?
      </h2>
      <p className="mt-3 text-neutral-500 dark:text-neutral-400">
        It takes less than a minute to paste your notes and start studying.
      </p>
      <Link
        href="/signup"
        className="mt-6 inline-block rounded-lg bg-neutral-900 px-6 py-3 text-base font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Get started for free
      </Link>
    </section>
  );
}
