import Link from "next/link";

// Top bar for logged-out visitors only — signed-in users get the sidebar
// shell instead (see AppShell), which the root layout switches on.
export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-amber-900/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-400 text-xs font-semibold text-white">
            Q
          </span>
          Quiznik
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-950/60 transition hover:bg-orange-100/70 hover:text-amber-950"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-rose-400 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-300"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
