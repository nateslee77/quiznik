"use client";

import { useState } from "react";

// Shared drag-and-drop handling for the various "pick or drop a photo"
// controls (NewSetForm rows, CardList's per-card control, the add-card row).
// Centralized so all three behave identically (only accept image files,
// only show the drop highlight while an image is actually being dragged).
export function useImageDrop(onFile: (file: File) => void) {
  const [isOver, setIsOver] = useState(false);

  function onDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setIsOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  }

  return { isOver, dropHandlers: { onDragOver, onDragLeave, onDrop } };
}
