import type { ReactNode } from "react";

export function GuestProfileSection({
  title,
  children,
  aside = false,
}: {
  title: string;
  children: ReactNode;
  aside?: boolean;
}) {
  return (
    <section className={["guest-panel", aside && "guest-panel--aside"].filter(Boolean).join(" ")}>
      <h3 className="guest-panel__title">{title}</h3>
      {children}
    </section>
  );
}
