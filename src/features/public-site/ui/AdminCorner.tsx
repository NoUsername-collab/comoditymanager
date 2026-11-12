import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/features/auth/login";
import { getSessionUser } from "@/services/auth-session";

/**
 * Only for signed-in staff, never guests: a thin strip above the header, in the
 * page's flow, so it covers nothing (the phone menu button, the language switch).
 */
export async function AdminCorner({
  className,
  style,
}: {
  /** The site's theme, so the strip takes its colours outside the site's frame. */
  className?: string;
  style?: CSSProperties;
}) {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  const t = await getTranslations("public.staffBar");

  return (
    <div className={["pub-staff-bar", className].filter(Boolean).join(" ")} style={style} role="region" aria-label={t("aria")}>
      <span className="pub-staff-bar__note">{t("signedIn")}</span>
      <Link href="/admin" className="pub-staff-bar__link">
        {t("panel")}
      </Link>
      <form action={logoutAction}>
        <button type="submit" className="pub-staff-bar__logout">
          {t("logout")}
        </button>
      </form>
    </div>
  );
}
