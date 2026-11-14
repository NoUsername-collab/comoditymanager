import { PublicNav } from "./PublicNav";
import { PublicTenantLogo } from "./PublicTenantLogo";
import { StaffLogoEntry } from "./StaffLogoEntry";
import { PublicMobileMenu } from "@/layout/components/PublicMobileMenu";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import { resolvePublicNavItems } from "@/features/public-site/domain/nav-items";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { effectivePublicTemplate } from "@/features/public-site/domain/template";
import { publicThemeClassName, resolvePublicSiteStyle } from "@/features/public-site/themes/loader";

/**
 * The site header, live and in the settings preview. `preview` draws the same
 * markup without anything that navigates: the logo's hidden staff login, the
 * menu links, the phone menu and the language switch.
 */
export function PublicHeader({
  config,
  locale,
  preview = false,
  previewPath = "/",
}: {
  config: PublicSiteConfig;
  locale: string;
  preview?: boolean;
  /** In the preview: the page shown, so its menu link is marked. */
  previewPath?: string;
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
          <div className="flex items-center gap-2 sm:gap-3" aria-hidden>
            <div className="ml-mobile-menu">
              <span className="ml-mobile-menu__trigger">
                <span className="ml-mobile-menu__bars">
                  <span />
                  <span />
                  <span />
                </span>
              </span>
            </div>
          <nav className="public-header__nav">
            {navItems.map((item) => (
              <span
                key={item.key}
                className={[
                  "public-header__link",
                  item.cta && "public-header__cta site-cta",
                  item.href === previewPath && "public-header__link--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {item.label}
                {item.children?.length ? (
                  <span className="public-header__caret" aria-hidden>
                    {" "}▾
                  </span>
                ) : null}
              </span>
            ))}
          </nav>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* The phone menu opens on the page's body, outside the site's frame: it takes the site's colours along. */}
            <PublicMobileMenu
              items={navItems}
              themeClassName={`site-themed ${publicThemeClassName(config.themeId)}`}
              themeStyle={resolvePublicSiteStyle(config.themeId, config.chrome, effectivePublicTemplate(config))}
            />
            <PublicNav items={navItems} />
            <HeaderLocaleSwitch slot="nav" />
          </div>
        )}
      </div>
    </header>
  );
}
