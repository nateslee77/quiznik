import { SpinnerIcon } from "@/components/icons";

// Route-level fallback shown by Next.js while a page's server data is
// loading (via each segment's loading.tsx) — replaces the blank/frozen gap
// between navigating and the page actually rendering.
export function LoadingScreen() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <SpinnerIcon className="h-6 w-6 animate-spin text-rose-400" />
    </div>
  );
}
