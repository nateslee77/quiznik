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
      <MascotPlaceholder variant="wave" className="mt-8 h-32 w-32 animate-bounce sm:h-40 sm:w-40" />

      <div className="mt-10 flex items-center gap-3">
        {user ? (
          <Link
            href="/home"
            className="rounded-xl bg-indigo-500 px-6 py-3 text-base font-medium text-white transition hover:bg-indigo-400"
          >
            Get started
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-xl border border-neutral-700 px-6 py-3 text-base font-medium text-neutral-300 transition hover:bg-white/5"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-indigo-500 px-6 py-3 text-base font-medium text-white transition hover:bg-indigo-400"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
