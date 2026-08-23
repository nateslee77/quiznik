import { parseSegments } from "@/lib/codeBlocks";
import { CodeBlock } from "@/components/CodeBlock";

// Drop-in replacement for rendering raw term/definition/choice text: plain
// text passes through unchanged, but any ```lang ... ``` fenced block gets
// pulled out into its own <CodeBlock>. Safe to use inside a <button> as
// long as `copyable={false}` is passed (see CodeBlock for why).
export function FormattedText({ text, copyable = true }: { text: string; copyable?: boolean }) {
  const segments = parseSegments(text);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlock key={i} lang={seg.lang} code={seg.value} copyable={copyable} />
        ) : seg.value ? (
          <span key={i} className="whitespace-pre-wrap break-words">
            {seg.value}
          </span>
        ) : null,
      )}
    </>
  );
}
