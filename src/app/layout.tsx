import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { getCoinBalance } from "@/lib/coins";
import { Navbar } from "@/components/Navbar";
import { AppShell } from "@/components/shell/AppShell";
import type { Folder } from "@/lib/types";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quiznik",
  description: "Make flashcard sets, study them, and test yourself.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialCoins = 0;
  let initialSkinId = "default";
  let folders: Folder[] = [];
  if (user) {
    const [balance, profileRes, foldersRes] = await Promise.all([
      getCoinBalance(supabase, user.id),
      supabase.from("profiles").select("equipped_skin").eq("user_id", user.id).maybeSingle(),
      supabase.from("folders").select("*").order("position").order("created_at"),
    ]);
    initialCoins = balance;
    initialSkinId = profileRes.data?.equipped_skin ?? "default";
    folders = foldersRes.data ?? [];
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none fixed -left-40 -top-40 z-0 h-[480px] w-[480px] rounded-full bg-rose-200/50 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed -bottom-40 -right-40 z-0 h-[480px] w-[480px] rounded-full bg-amber-200/40 blur-3xl"
        />
        {user ? (
          <AppShell initialCoins={initialCoins} initialSkinId={initialSkinId} folders={folders}>
            {children}
          </AppShell>
        ) : (
          <>
            <Navbar />
            <div className="relative z-10 flex flex-1 flex-col">{children}</div>
          </>
        )}
      </body>
    </html>
  );
}
