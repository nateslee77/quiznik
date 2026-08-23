import type { ReactNode } from "react";

// Recognizes fenced code blocks the same way Markdown / Claude chat does:
// ```lang\n...\n``` — so "how to paste code" instructions can just say
// "wrap it in triple backticks," a convention most people already know.
export type Segment = { type: "text"; value: string } | { type: "code"; lang?: string; value: string };

const FENCE_RE = /```([\w+#-]*)\n?([\s\S]*?)```/g;

export function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;
  while ((match = FENCE_RE.exec(text))) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", lang: match[1]?.trim() || undefined, value: match[2].replace(/\n$/, "") });
    lastIndex = FENCE_RE.lastIndex;
  }
  if (lastIndex < text.length) segments.push({ type: "text", value: text.slice(lastIndex) });
  if (segments.length === 0) segments.push({ type: "text", value: text });
  return segments;
}

// True when the whole string is nothing but a single fenced block (plus
// surrounding whitespace) — lets callers skip rendering an empty text
// segment around it.
export function isPureCode(text: string): boolean {
  const segments = parseSegments(text);
  return segments.length === 1 && segments[0].type === "code";
}

const LANGUAGE_LABELS: Record<string, string> = {
  py: "Python",
  python: "Python",
  java: "Java",
  php: "PHP",
  cpp: "C++",
  "c++": "C++",
  cc: "C++",
  cxx: "C++",
  c: "C",
  cs: "C#",
  csharp: "C#",
  "c#": "C#",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  json: "JSON",
  sh: "Shell",
  bash: "Shell",
};

export function displayLanguage(lang?: string): string {
  if (!lang) return "Code";
  return LANGUAGE_LABELS[lang.toLowerCase()] ?? lang.toUpperCase();
}

function normalizeLang(lang?: string): string {
  const l = (lang ?? "").toLowerCase();
  if (l === "py" || l === "python") return "python";
  if (l === "java") return "java";
  if (l === "php") return "php";
  if (l === "cpp" || l === "c++" || l === "cc" || l === "cxx" || l === "c") return "cpp";
  if (l === "cs" || l === "csharp" || l === "c#") return "csharp";
  return l;
}

const KEYWORDS: Record<string, string[]> = {
  python: [
    "def", "class", "return", "if", "elif", "else", "for", "while", "import", "from", "as", "in", "is",
    "not", "and", "or", "try", "except", "finally", "with", "pass", "break", "continue", "lambda", "yield",
    "None", "True", "False", "self", "raise", "global", "nonlocal", "assert", "async", "await", "del",
  ],
  java: [
    "public", "private", "protected", "class", "interface", "extends", "implements", "static", "final",
    "void", "new", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
    "try", "catch", "finally", "throw", "throws", "import", "package", "this", "super", "null", "true",
    "false", "int", "long", "short", "byte", "float", "double", "boolean", "char", "String", "abstract",
    "synchronized", "volatile", "enum", "instanceof",
  ],
  php: [
    "function", "return", "if", "elseif", "else", "for", "foreach", "while", "do", "switch", "case",
    "break", "continue", "try", "catch", "finally", "throw", "echo", "print", "class", "interface",
    "extends", "implements", "public", "private", "protected", "static", "const", "new", "null", "true",
    "false", "namespace", "use", "require", "require_once", "include", "include_once", "array", "as",
    "global", "match", "fn",
  ],
  cpp: [
    "int", "long", "short", "float", "double", "char", "bool", "void", "class", "struct", "public",
    "private", "protected", "virtual", "override", "static", "const", "constexpr", "return", "if", "else",
    "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "throw", "new", "delete",
    "namespace", "using", "template", "typename", "nullptr", "true", "false", "include", "auto", "this",
    "enum", "union", "friend",
  ],
  csharp: [
    "public", "private", "protected", "internal", "class", "interface", "struct", "static", "readonly",
    "const", "void", "int", "long", "short", "float", "double", "decimal", "bool", "char", "string",
    "object", "var", "new", "return", "if", "else", "for", "foreach", "in", "while", "do", "switch", "case",
    "break", "continue", "try", "catch", "finally", "throw", "using", "namespace", "null", "true", "false",
    "this", "base", "override", "virtual", "abstract", "sealed", "enum", "async", "await", "get", "set",
  ],
};

const GENERIC_KEYWORDS = ["function", "return", "if", "else", "for", "while", "class", "const", "let", "var", "import", "export", "new", "true", "false", "null"];

function keywordsFor(lang?: string): Set<string> {
  return new Set(KEYWORDS[normalizeLang(lang)] ?? GENERIC_KEYWORDS);
}

// Deliberately simple: comments / strings / numbers / keywords via one
// regex pass. Not a real tokenizer (no per-language grammar), but enough to
// make pasted Java/Python/PHP/C++/C# read like code instead of a text wall.
const TOKEN_RE = /(\/\/.*$)|(#.*$)|(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)/gm;

const TOKEN_CLASSES = {
  comment: "text-slate-400 italic",
  string: "text-emerald-700",
  number: "text-sky-700",
  keyword: "text-rose-600 font-medium",
};

export function highlightCode(code: string, lang?: string): ReactNode[] {
  const keywords = keywordsFor(lang);
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(code))) {
    if (m.index > lastIndex) nodes.push(code.slice(lastIndex, m.index));
    const [full, lineComment, hashComment, blockComment, str, num, ident] = m;
    if (lineComment || hashComment || blockComment) {
      nodes.push(<span key={key++} className={TOKEN_CLASSES.comment}>{full}</span>);
    } else if (str) {
      nodes.push(<span key={key++} className={TOKEN_CLASSES.string}>{full}</span>);
    } else if (num) {
      nodes.push(<span key={key++} className={TOKEN_CLASSES.number}>{full}</span>);
    } else if (ident && keywords.has(ident)) {
      nodes.push(<span key={key++} className={TOKEN_CLASSES.keyword}>{full}</span>);
    } else {
      nodes.push(full);
    }
    lastIndex = TOKEN_RE.lastIndex;
  }
  if (lastIndex < code.length) nodes.push(code.slice(lastIndex));
  return nodes;
}
