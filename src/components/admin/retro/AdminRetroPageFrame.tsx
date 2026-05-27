import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { btnPrimary } from "@/lib/admin-ui";
import { RetroXpWindow } from "./RetroXpWindow";

/** Admin page with XP frame and Win98-style interior. */
export function AdminRetroPageFrame({
  title,
  description,
  backHref,
  backLabel,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const plainDescription =
    typeof description === "string" || typeof description === "number";

  return (
    <main className={["p-8", className].filter(Boolean).join(" ")}>
      {backHref && (
        <Link href={backHref} className="admin-retro-back mb-3 inline-block">
          ← {backLabel ?? ""}
        </Link>
      )}
      <RetroXpWindow title={title} bodyClassName={bodyClassName}>
        {(description || action) && (
          <div className="admin-retro-page-toolbar mb-4 flex flex-wrap items-start justify-between gap-3">
            {description ? (
              plainDescription ? (
                <p className="admin-retro-page-desc max-w-2xl text-sm leading-relaxed">
                  {description}
                </p>
              ) : (
                <div className="admin-retro-page-desc min-w-0 flex-1">
                  {description}
                </div>
              )
            ) : (
              <span />
            )}
            {action && (
              <Link href={action.href} className={btnPrimary}>
                {action.label}
              </Link>
            )}
          </div>
        )}
        {children}
      </RetroXpWindow>
    </main>
  );
}
