import type { ReactNode } from "react";

export function publicLegalEmailNode(email: string | null): ReactNode {
  if (!email) return null;
  return <a href={`mailto:${email}`}>{email}</a>;
}

export function PublicLegalCopy({ text }: { text: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <>
      {blocks.map((block) => (
        <p key={block.slice(0, 48)} style={{ whiteSpace: "pre-wrap" }}>
          {block}
        </p>
      ))}
    </>
  );
}
