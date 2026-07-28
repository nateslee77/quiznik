import { createClient } from "@/lib/supabase/server";
import { NewSetForm } from "@/components/NewSetForm";

export default async function NewSetPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder } = await searchParams;

  // Resolve the target folder (if any) so the heading can show it and an
  // invalid/foreign id silently falls back to no folder.
  let folderId: string | null = null;
  let folderName: string | null = null;
  if (folder) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("folders")
      .select("id, name")
      .eq("id", folder)
      .maybeSingle();
    if (data) {
      folderId = data.id;
      folderName = data.name;
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Create a new set</h1>
      {folderName ? (
        <p className="mb-6 text-sm text-amber-950/50">
          Will be added to <span className="font-medium text-amber-950/80">{folderName}</span>
        </p>
      ) : (
        <div className="mb-6" />
      )}
      <NewSetForm folderId={folderId} />
    </main>
  );
}
