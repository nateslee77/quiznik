"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/shell/Sidebar";
import { DockedMascot, MascotProvider } from "@/components/mascot/MascotContext";
import { MenuIcon } from "@/components/icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <MascotProvider>
      <div className="relative z-10 flex min-h-full flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-amber-900/10 bg-white/60 lg:block">
          <Sidebar />
        </aside>

        {/* Mobile top bar + slide-over drawer */}
        <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-amber-900/10 bg-white/80 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-1.5 text-amber-950/60 transition hover:bg-orange-100/70 hover:text-amber-950"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-400 text-xs font-semibold text-white">
              Q
            </span>
            Quiznik
          </Link>
        </div>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <aside className="absolute inset-y-0 left-0 w-72 border-r border-amber-900/15 bg-[#fff7f0]">
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </div>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">{children}</main>

        <DockedMascot />
      </div>
    </MascotProvider>
  );
}
