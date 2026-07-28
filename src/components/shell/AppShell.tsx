"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar, type SidebarDeck } from "@/components/shell/Sidebar";
import { MenuIcon } from "@/components/icons";
import type { Folder } from "@/lib/types";

export function AppShell({
  folders,
  decks,
  children,
}: {
  folders: Folder[];
  decks: SidebarDeck[];
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="relative z-10 flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/5 bg-neutral-950/40 lg:block">
        <Sidebar folders={folders} decks={decks} />
      </aside>

      {/* Mobile top bar + slide-over drawer */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-white/5 bg-neutral-950/80 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-white/5 hover:text-white"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500 text-xs font-semibold text-white">
            Q
          </span>
          Quiznik
        </Link>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-neutral-950">
            <Sidebar folders={folders} decks={decks} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
