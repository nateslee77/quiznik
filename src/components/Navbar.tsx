import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href={user ? "/sets" : "/"} className="text-lg font-semibold tracking-tight">
          Quiznik
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/sets"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              My sets
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
              >
                Log out
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400 sm:flex">
              <Link href="/#features" className="hover:text-neutral-900 dark:hover:text-white">
                Features
              </Link>
              <Link href="/#how-it-works" className="hover:text-neutral-900 dark:hover:text-white">
                How it works
              </Link>
              <Link href="/#faq" className="hover:text-neutral-900 dark:hover:text-white">
                FAQ
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
