import type { Folder } from "@/lib/types";

export type FolderRef = Pick<Folder, "id" | "parent_id" | "name">;

// Root-to-leaf ancestor chain for a folder, e.g. [Grandparent, Parent, Self].
// Returns [] when folderId is null or not found.
export function folderAncestors<T extends FolderRef>(folders: T[], folderId: string | null): T[] {
  const self = folderId ? folders.find((f) => f.id === folderId) : undefined;
  if (!self) return [];

  const chain: T[] = [self];
  let cursor = self;
  while (cursor.parent_id) {
    const parent = folders.find((f) => f.id === cursor.parent_id);
    if (!parent) break;
    chain.unshift(parent);
    cursor = parent;
  }
  return chain;
}
