import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { btnPrimary } from "@/lib/admin-ui";
import { AdminPanel } from "./AdminPanel";

/** Cadru pagină admin — layout standard cu panou secțiune. */
export async function AdminPageFrame({
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
  const tCommon = await getTranslations("admin.common");
  const plainDescription =
    typeof description === "string" || typeof description === "number";

  return (
    <main
      className={["ml-content admin-page p-3 sm:p-4 lg:p-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      {backHref && (
        <Link href={backHref} className="admin-page-back mb-2 inline-block">
          ← {backLabel ?? ""}
        </Link>
      )}
      <AdminPanel
        title={title}
        bodyClassName={bodyClassName}
        controlTitles={{
          minimize: tCommon("minimize"),
          maximize: tCommon("maximize"),
          close: tCommon("close"),
        }}
      >
        {(description || action) && (
          <div className="admin-page-toolbar mb-2 flex flex-wrap items-start justify-between gap-2">
            {description ? (
              plainDescription ? (
                <p className="admin-page-desc max-w-2xl text-sm leading-snug">
                  {description}
                </p>
              ) : (
                <div className="admin-page-desc min-w-0 flex-1">
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
      </AdminPanel>
    </main>
  );
}
