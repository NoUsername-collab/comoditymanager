export function PublicTenantLogo({
  logoUrl,
  displayName,
}: {
  logoUrl?: string | null;
  displayName: string;
}) {
  const frame = "h-16 w-16 shrink-0 rounded-lg sm:h-[4.5rem] sm:w-[4.5rem]";
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={displayName}
        className={`${frame} object-contain`}
      />
    );
  }

  const initial = displayName.trim().slice(0, 1).toUpperCase() || "•";
  return (
    <span
      className={`public-header__logo-fallback flex items-center justify-center text-lg font-bold ${frame}`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
