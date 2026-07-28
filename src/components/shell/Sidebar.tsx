"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import {
  ChatIcon,
  HomeIcon,
  LibraryIcon,
  PlusIcon,
  SparkleIcon,
} from "@/components/icons";

function NavLink({
  href,
  active,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-rose-100 text-rose-500"
          : "text-amber-950/60 hover:bg-orange-100/70 hover:text-amber-950"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="no-scrollbar flex h-full flex-col gap-1 overflow-y-auto px-3 py-4">
      {/* Logo — returns to the landing page */}
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-2 flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-orange-100/70"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-400 text-sm font-semibold text-white">
          Q
        </span>
        <span className="flex-1 truncate text-sm font-semibold">Quiznik</span>
      </Link>

      <NavLink
        href="/home"
        active={pathname === "/home"}
        icon={<HomeIcon className="h-4 w-4" />}
        label="Home"
        onNavigate={onNavigate}
      />
      <NavLink
        href="/sets"
        active={pathname === "/sets"}
        icon={<LibraryIcon className="h-4 w-4" />}
        label="Library"
        onNavigate={onNavigate}
      />
      <div className="flex cursor-default items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-amber-950/40">
        <ChatIcon className="h-4 w-4" />
        Chat
        <span className="ml-auto rounded-full bg-orange-100/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-950/50">
          Soon
        </span>
      </div>
      <NavLink
        href="/shop"
        active={pathname === "/shop"}
        icon={<SparkleIcon className="h-4 w-4" />}
        label="Shop"
        onNavigate={onNavigate}
      />

      <Link
        href="/sets/new"
        onClick={onNavigate}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-rose-400 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-300"
      >
        <PlusIcon className="h-4 w-4" />
        New deck
      </Link>

      <div className="mt-auto pt-4">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-amber-950/50 transition hover:bg-orange-100/70 hover:text-amber-950/80"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
