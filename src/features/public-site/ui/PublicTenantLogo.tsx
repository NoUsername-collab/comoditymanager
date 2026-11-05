/**
 * The guesthouse logo in the site header. Without one the header shows only the
 * name: a letter in a box reads as a placeholder, not as a brand.
 */
export function PublicTenantLogo({
  logoUrl,
  displayName,
}: {
  logoUrl?: string | null;
  displayName: string;
}) {
  if (!logoUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={displayName}
      className="h-16 w-16 shrink-0 rounded-lg object-contain sm:h-[4.5rem] sm:w-[4.5rem]"
    />
  );
}
