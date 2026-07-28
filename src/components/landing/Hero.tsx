import Link from "next/link";
import { MascotPlaceholder } from "@/components/landing/MascotPlaceholder";

export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <MascotPlaceholder variant="wave" className="mb-6 h-24 w-24 sm:h-28 sm:w-28" />

      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Turn any text into flashcards.
      </h1>
      <p className="mt-4 max-w-md text-balance text-neutral-500 dark:text-neutral-400">
        Paste your notes, study with flip cards, and let Quiznik adapt to what
        you already know — all saved to your account.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-indigo-500 px-5 py-2.5 text-base font-medium text-white transition hover:bg-indigo-400"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-neutral-300 px-5 py-2.5 text-base font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          Log in
        </Link>
      </div>
    </section>
  );
}
