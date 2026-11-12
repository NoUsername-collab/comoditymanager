import { bindTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { AdminCorner } from "@/features/public-site/ui/AdminCorner";
import { SiteVisitBeacon } from "@/features/public-site/ui/SiteVisitBeacon";
import { PublicFooter } from "@/features/public-site/ui/PublicFooter";
import { PublicHeader } from "@/features/public-site/ui/PublicHeader";
import { PublicLodgingJsonLd } from "@/features/public-site/ui/PublicLodgingJsonLd";
import { PublicContactBar } from "@/features/public-site/contact/PublicContactBar";
import { effectivePublicTemplate } from "@/features/public-site/domain/template";
import {
  publicThemeClassName,
  resolvePublicSiteStyle,
} from "@/features/public-site/themes/loader";
import { MobileShell } from "@/layout/components/MobileShell";
import { loadPublicSiteConfig } from "@/features/public-site/loaders";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import "@/styles/features/public/public-site.css";
import "@/styles/features/public/public-site-v2.css";
import "@/styles/features/public/public-site-layouts.css";
import "@/styles/features/layout/mobile-public.css";

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadPublicSiteConfig();
  const icon = config.chrome.logoUrl;
  const name = config.displayName.trim();
  return {
    ...(name ? { title: name, applicationName: name, description: null } : {}),
    ...(icon ? { icons: { icon, apple: icon } } : {}),
  };
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await bindTenantContextFromRequest();

  const [config, tFooter, tContact, locale] = await Promise.all([
    loadPublicSiteConfig(),
    getTranslations("public.footer"),
    getTranslations("public.contact"),
    getLocale(),
  ]);

  const style = resolvePublicSiteStyle(config.themeId, config.chrome, effectivePublicTemplate(config));

  return (
    <>
      <PublicLodgingJsonLd config={config} locale={locale} />
      {/* Above the site's frame: a layout may lay its header over the top of the page. */}
      <AdminCorner className={`site-themed ${publicThemeClassName(config.themeId)}`} style={style} />
      <MobileShell
        surface="public"
        className={`site-themed ${publicThemeClassName(config.themeId)} flex min-h-screen flex-1 flex-col`}
        style={style}
        data-pub-template={effectivePublicTemplate(config)}
      >
        <SiteVisitBeacon />
        <PublicHeader config={config} locale={locale} />
        <div className="ml-main ml-content flex-1">{children}</div>
        {config.chrome.showContactBar !== false ? (
          <PublicContactBar
            contact={config.contact}
            title={tFooter("contact")}
            labels={{
              email: tContact("email"),
              whatsapp: tContact("whatsapp"),
              telegram: tContact("telegram"),
              facebook: tContact("facebook"),
              instagram: tContact("instagram"),
            }}
          />
        ) : null}
        <PublicFooter config={config} locale={locale} />
      </MobileShell>
    </>
  );
}
