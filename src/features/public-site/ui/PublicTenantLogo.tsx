import type { ReactNode } from "react";

export function PublicTenantLogo({
  logoUrl,
  displayName,
  children,
}: {
  logoUrl?: string | null;
  displayName: string;
  children: ReactNode;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={displayName}
        className="h-16 w-16 object-contain sm:h-[4.5rem] sm:w-[4.5rem]"
      />
    );
  }
  return children;
}
