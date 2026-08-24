import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetHeader } from "@/components/SetHeader";
import { CardList } from "@/components/CardList";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BoltIcon, DeckIcon, GearIcon, GravityIcon, MatchIcon } from "@/components/icons";
import type { Card, Folder, StudyStatus } from "@/lib/types";

function ModeCard({
  href,
  icon,
  tint,
  name,
  description,
  stat,
  recommended,
}: {
  href: string;
  icon: React.ReactNode;
  tint: string;
  name: string;
  description: string;
  stat: string;
  recommended?: boolean;
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-col gap-2 rounded-2xl border border-amber-900/10 bg-surface p-4 transition hover:border-rose-200 hover:bg-orange-50"
    >
      {recommended ? (
        <span className="absolute right-3 top-3 rounded-full bg-rose-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-contrast">
          Recommended
        </span>
      ) : null}
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
      <span className="mt-1 text-sm font-semibold">{name}</span>
      <span className="text-xs text-amber-950/50">{description}</span>
      <span className="text-xs font-medium text-amber-950/60">{stat}</span>
    </Link>
  );
}

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: set } = await supabase.from("sets").select("*").eq("id", id).single();
  if (!set) notFound();

  const [cardsRes, foldersRes, progressRes] = await Promise.all([
    supabase.from("cards").select("*").eq("set_id", id).order("position", { ascending: true }),
    supabase.from("folders").select("*").order("position").order("created_at"),
    supabase.from("study_progress").select("card_id, status").eq("set_id", id),
  ]);

  const cardList: Card[] = cardsRes.data ?? [];
  const folders: Folder[] = foldersRes.data ?? [];
  const progress = progressRes.data ?? [];

  const learningCount = progress.filter((p) => p.status === "seen" || p.status === "review").length;
  const newCount = cardList.length - progress.length;
  const masteredCount = progress.filter((p) => p.status === "mastered").length;
  const recommendLearn = learningCount + newCount > 0;

  const progressByCardId: Record<string, StudyStatus> = {};
  for (const row of progress) {
    progressByCardId[row.card_id] = row.status as StudyStatus;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
      <Breadcrumb folders={folders} folderId={set.folder_id} trailingLabel={set.title} />
      <SetHeader set={set} folders={folders} />

      {cardList.length > 0 ? (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ModeCard
            href={`/sets/${id}/study`}
            icon={<DeckIcon className="h-5 w-5" />}
            tint="bg-sky-500/15 text-sky-300"
            name="Flashcards"
            description="Flip through the deck at your own pace"
            stat={`${cardList.length} card${cardList.length === 1 ? "" : "s"}`}
            recommended={!recommendLearn}
          />
          <ModeCard
            href={`/sets/${id}/learn`}
            icon={<BoltIcon className="h-5 w-5" />}
            tint="bg-rose-100 text-rose-500"
            name="Learn"
            description="Adaptive review that tracks each card"
            stat={
              recommendLearn
                ? `${learningCount} learning · ${newCount} new`
                : `${masteredCount} mastered`
            }
            recommended={recommendLearn}
          />
          <ModeCard
            href={`/sets/${id}/test`}
            icon={<GearIcon className="h-5 w-5" />}
            tint="bg-amber-200/70 text-amber-700"
            name="Test"
            description="Quiz yourself with your own settings"
            stat={cardList.length >= 2 ? "Configurable" : "Needs 2+ cards"}
          />
          <ModeCard
            href={`/sets/${id}/match`}
            icon={<MatchIcon className="h-5 w-5" />}
            tint="bg-sky-100 text-sky-600"
            name="Match"
            description="Race to pair terms and definitions"
            stat={cardList.length >= 3 ? "Configurable" : "Needs 3+ cards"}
          />
          <ModeCard
            href={`/sets/${id}/gravity`}
            icon={<GravityIcon className="h-5 w-5" />}
            tint="bg-emerald-100 text-emerald-600"
            name="Gravity"
            description="Type answers before they fall"
            stat={cardList.length >= 4 ? "3 lives" : "Needs 4+ cards"}
          />
        </div>
      ) : null}

      <CardList setId={id} cards={cardList} progressByCardId={progressByCardId} />
    </main>
  );
}
