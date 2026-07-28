import Link from "next/link";
import { MascotPlaceholder } from "@/components/landing/MascotPlaceholder";

function currentYear(): number {
  return new Date().getFullYear();
}

export function LandingFooter() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <MascotPlaceholder variant="happy" className="h-8 w-8" />
          <span className="font-semibold tracking-tight">Quiznik</span>
        </div>

        <div className="flex gap-12 text-sm">
          <div>
            <h3 className="mb-2 font-medium text-neutral-500 dark:text-neutral-400">Explore</h3>
            <ul className="flex flex-col gap-1.5">
              <li>
                <Link href="/#features" className="hover:underline">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:underline">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:underline">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-medium text-neutral-500 dark:text-neutral-400">Account</h3>
            <ul className="flex flex-col gap-1.5">
              <li>
                <Link href="/login" className="hover:underline">
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:underline">
                  Sign up
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-neutral-400">
        © {currentYear()} Quiznik.
      </p>
    </footer>
  );
}
