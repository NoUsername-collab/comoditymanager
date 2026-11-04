import { PublicNav } from "./PublicNav";
import { PublicTenantLogo } from "./PublicTenantLogo";
import { StaffLogoEntry } from "./StaffLogoEntry";
import { PublicMobileMenu } from "@/layout/components/PublicMobileMenu";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import { resolvePublicNavItems } from "@/features/public-site/domain/nav-items";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";

/**
 * The site header, live and in the settings preview. `preview` draws the same
 * markup without anything that navigates: the logo's hidden staff login, the
 * menu links, the phone menu and the language switch.
 */
export function PublicHeader({
  config,
  locale,
  preview = false,
}: {
  config: PublicSiteConfig;
  locale: string;
  preview?: boolean;
}) {
  const subtitle = pickOwnLocalized(config.chrome.headerSubtitle, locale);
  const navItems = resolvePublicNavItems(config, locale);
  const brand = (
    <>
      <PublicTenantLogo logoUrl={config.chrome.logoUrl} displayName={config.displayName} />
      <div className="min-w-0 leading-tight">
        <span className="public-header__name">{config.displayName}</span>
        {subtitle ? <span className="public-header__tag">{subtitle}</span> : null}
      </div>
    </>
  );

  return (
    <header className="public-header">
      <div className="public-header__inner">
        {preview ? (
          <div className="public-header__brand">{brand}</div>
        ) : (
          <StaffLogoEntry className="public-header__brand group cursor-pointer">{brand}</StaffLogoEntry>
        )}
        {preview ? (
          <nav className="public-header__nav" aria-hidden>
            {navItems.map((item) => (
              <span
                key={item.key}
                className={[
                  "public-header__link",
                  item.cta && "public-header__cta site-cta",
                  item.key === "home" && "public-header__link--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {item.label}
              </span>
            ))}
          </nav>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <PublicMobileMenu items={navItems} />
            <PublicNav items={navItems} />
            <HeaderLocaleSwitch slot="nav" />
          </div>
        )}
      </div>
    </header>
  );
}
