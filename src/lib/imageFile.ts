// No "use client"/"use server" directive — this is plain logic imported by
// both the drag-and-drop client hook and the server-side upload actions.

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
};

function extOf(file: File): string | null {
  const dot = file.name.lastIndexOf(".");
  if (dot === -1) return null;
  return file.name.slice(dot + 1).toLowerCase();
}

// The browser-reported `file.type` can come back as an empty string for a
// real image — this depends on the OS having a registered MIME association
// for that extension, and Windows in particular often lacks one for .webp.
// Falling back to the extension avoids silently rejecting (or mislabeling)
// a perfectly valid image just because the OS didn't know what it was.
export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const ext = extOf(file);
  return ext != null && ext in EXT_MIME;
}

export function imageContentType(file: File): string | undefined {
  if (file.type) return file.type;
  const ext = extOf(file);
  return ext ? EXT_MIME[ext] : undefined;
}
