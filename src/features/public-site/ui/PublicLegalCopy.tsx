/** Fills `{name}` and `{email}` in operator legal text with the current contact. */
export function fillLegalPlaceholders(
  text: string,
  values: { name: string; email: string | null | undefined },
): string {
  const email = values.email?.trim() || values.name;
  return text.replaceAll("{name}", values.name).replaceAll("{email}", email);
}

export function PublicLegalCopy({
  text,
  values,
}: {
  text: string;
  values: { name: string; email: string | null | undefined };
}) {
  const blocks = fillLegalPlaceholders(text, values)
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
