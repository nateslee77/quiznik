import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MascotPlaceholder } from "@/components/landing/MascotPlaceholder";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Quiznik</h1>

      {/* Placeholder for the mascot gif — swap MascotPlaceholder for a real
          animated asset later. */}
      <MascotPlaceholder variant="idle" className="mt-8 h-32 w-32 sm:h-40 sm:w-40" />

      <div className="mt-10 flex items-center gap-3">
        {user ? (
          <Link
            href="/home"
            className="rounded-xl bg-rose-400 px-6 py-3 text-base font-medium text-rose-contrast transition hover:bg-rose-300"
          >
            Get started
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-xl border border-amber-900/20 px-6 py-3 text-base font-medium text-amber-950/80 transition hover:bg-orange-100/70"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-rose-400 px-6 py-3 text-base font-medium text-rose-contrast transition hover:bg-rose-300"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
