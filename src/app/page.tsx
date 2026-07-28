import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/sets");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Turn any text into flashcards.
      </h1>
      <p className="mt-4 max-w-md text-balance text-neutral-500 dark:text-neutral-400">
        Paste your notes, study with flip cards, and test yourself — all saved
        to your account.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
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
    </main>
  );
}
