"use client";

import { forwardRef, useEffect, useRef } from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

function resize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

// Drop-in replacement for a single-line <input> that grows with its
// content instead of clipping or scrolling — needed so pasted multi-line
// code survives at all (a single-line <input> strips newlines on paste).
export const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea(
  { className = "", onInput, value, ...rest },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement>(null);

  // Catches programmatic value changes (e.g. clearing the field after
  // submit) that don't fire a real input event.
  useEffect(() => {
    if (innerRef.current) resize(innerRef.current);
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        innerRef.current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      }}
      rows={1}
      value={value}
      onInput={(e) => {
        resize(e.currentTarget);
        onInput?.(e);
      }}
      className={`resize-none overflow-hidden ${className}`}
      {...rest}
    />
  );
});
