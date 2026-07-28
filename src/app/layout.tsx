import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
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

  let folders: Folder[] = [];
  let decks: { id: string; title: string; folder_id: string | null }[] = [];

  if (user) {
    const [foldersRes, decksRes] = await Promise.all([
      supabase.from("folders").select("*").order("position").order("created_at"),
      supabase
        .from("sets")
        .select("id, title, folder_id")
        .order("updated_at", { ascending: false }),
    ]);
    folders = foldersRes.data ?? [];
    decks = decksRes.data ?? [];
  }

  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none fixed -left-40 -top-40 z-0 h-[480px] w-[480px] rounded-full bg-indigo-600/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed -bottom-40 -right-40 z-0 h-[480px] w-[480px] rounded-full bg-violet-600/10 blur-3xl"
        />
        {user ? (
          <AppShell folders={folders} decks={decks}>
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
