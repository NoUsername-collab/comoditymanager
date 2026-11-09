/**
 * The small text format operators write in: blank lines make paragraphs, lines
 * starting with "- " make a list, **double stars** make bold, [words](address)
 * makes a link. Parsed into blocks rendered as React elements, never as HTML,
 * so nothing an operator types can inject markup.
 */

export type RichInline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "link"; text: string; href: string; external: boolean }
  | { kind: "break" };

export type RichBlock =
  | { kind: "paragraph"; content: RichInline[] }
  | { kind: "list"; items: RichInline[][] };

const LIST_ITEM = /^\s*[-•*]\s+/;
const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Addresses a link may point to: the web, mail, phone, or a page of this site. */
export function safeRichHref(raw: string): { href: string; external: boolean } | null {
  const href = raw.trim();
  if (/^https?:\/\/[^\s]+$/i.test(href)) return { href, external: true };
  if (/^(mailto|tel):[^\s]+$/i.test(href)) return { href, external: false };
  if (/^\/(?!\/)[^\s]*$/.test(href) || /^#[\w-]+$/.test(href)) return { href, external: false };
  return null;
}

function parseLine(line: string): RichInline[] {
  const out: RichInline[] = [];
  let last = 0;
  for (const match of line.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ kind: "text", text: line.slice(last, index) });
    if (match[1] !== undefined) {
      out.push({ kind: "bold", text: match[1] });
    } else {
      const safe = safeRichHref(match[3] ?? "");
      // An unsafe address stays as plain words: the operator sees it did not link.
      out.push(safe ? { kind: "link", text: match[2] ?? "", ...safe } : { kind: "text", text: match[0] });
    }
    last = index + match[0].length;
  }
  if (last < line.length) out.push({ kind: "text", text: line.slice(last) });
  return out;
}

export function parseRichText(source: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  for (const chunk of source.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 0) continue;
    let paragraph: string[] = [];
    let list: string[] = [];
    const flushParagraph = () => {
      if (paragraph.length === 0) return;
      const content = paragraph.flatMap((line, i) =>
        i === 0 ? parseLine(line) : [{ kind: "break" } as RichInline, ...parseLine(line)],
      );
      blocks.push({ kind: "paragraph", content });
      paragraph = [];
    };
    const flushList = () => {
      if (list.length === 0) return;
      blocks.push({ kind: "list", items: list.map((line) => parseLine(line.replace(LIST_ITEM, ""))) });
      list = [];
    };
    for (const line of lines) {
      if (LIST_ITEM.test(line)) {
        flushParagraph();
        list.push(line);
      } else {
        flushList();
        paragraph.push(line.trim());
      }
    }
    flushParagraph();
    flushList();
  }
  return blocks;
}
