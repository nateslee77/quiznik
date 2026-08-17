import Link from "next/link";
import { folderAncestors, type FolderRef } from "@/lib/folderPath";

// Drive-style "where am I" trail: Library / Parent / Child / [trailing].
// Every folder segment links back to that folder's library view; the
// trailing label (a deck title, or a deck + mode like "Biology · Study") is
// always the current page and never a link.
export function Breadcrumb({
  folders,
  folderId,
  deckLabel,
  deckHref,
  trailingLabel,
}: {
  folders: FolderRef[];
  folderId: string | null;
  /** Deck name segment. Rendered as a link to `deckHref` when given (e.g. from
   * Study/Test/Learn, to get back to the deck), or plain text otherwise. */
  deckLabel?: string;
  deckHref?: string;
  /** Final, always-plain segment — the current page (a mode name, etc). */
  trailingLabel?: string;
}) {
  const crumbs = folderAncestors(folders, folderId);

  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-amber-950/50">
      <Link href="/sets" className="rounded px-1 hover:text-amber-950/80">
        Library
      </Link>
      {crumbs.map((folder) => (
        <span key={folder.id} className="flex items-center gap-1">
          <span>/</span>
          <Link href={`/sets?folder=${folder.id}`} className="rounded px-1 hover:text-amber-950/80">
            {folder.name}
          </Link>
        </span>
      ))}
      {deckLabel ? (
        <span className="flex items-center gap-1">
          <span>/</span>
          {deckHref ? (
            <Link href={deckHref} className="rounded px-1 hover:text-amber-950/80">
              {deckLabel}
            </Link>
          ) : (
            <span className="px-1 text-amber-950/80">{deckLabel}</span>
          )}
        </span>
      ) : null}
      {trailingLabel ? (
        <span className="flex items-center gap-1">
          <span>/</span>
          <span className="px-1 text-amber-950/80">{trailingLabel}</span>
        </span>
      ) : null}
    </nav>
  );
}
