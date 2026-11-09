import type { ReactNode } from "react";
import { parseRichText, type RichInline } from "@/features/public-site/domain/rich-text";

function inline(part: RichInline, key: number): ReactNode {
  switch (part.kind) {
    case "text":
      return part.text;
    case "bold":
      return <strong key={key}>{part.text}</strong>;
    case "break":
      return <br key={key} />;
    case "link":
      return part.external ? (
        <a key={key} href={part.href} target="_blank" rel="noopener noreferrer">
          {part.text}
        </a>
      ) : (
        <a key={key} href={part.href}>
          {part.text}
        </a>
      );
  }
}

/** An operator's formatted text: paragraphs, lists, bold and links. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = parseRichText(text);
  if (blocks.length === 0) return null;
  return (
    <div className={["pub-rich", className].filter(Boolean).join(" ")}>
      {blocks.map((block, index) =>
        block.kind === "list" ? (
          <ul key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item.map(inline)}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>{block.content.map(inline)}</p>
        ),
      )}
    </div>
  );
}
