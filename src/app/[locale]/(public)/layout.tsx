import { bindTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { AdminCorner } from "@/features/public-site/ui/AdminCorner";
import { PublicFooter } from "@/features/public-site/ui/PublicFooter";
import { PublicHeader } from "@/features/public-site/ui/PublicHeader";
import { PublicLodgingJsonLd } from "@/features/public-site/ui/PublicLodgingJsonLd";
import { PublicContactBar } from "@/features/public-site/contact/PublicContactBar";
import { PublicSiteConfigProvider } from "@/features/public-site/PublicSiteConfigProvider";
import { publicChromeFontStack } from "@/features/public-site/domain/chrome";
import {
  publicThemeClassName,
  resolvePublicThemeStyle,
} from "@/features/public-site/themes/loader";
import { MobileShell } from "@/layout/components/MobileShell";
import { loadPublicSiteConfig } from "@/features/public-site/loaders";
import { getLocale, getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import "@/styles/features/public/public-site.css";
import "@/styles/features/public/public-site-v2.css";
import "@/styles/features/public/public-site-layouts.css";
import "@/styles/features/layout/mobile-public.css";

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadPublicSiteConfig();
  const icon = config.chrome.logoUrl;
  return icon ? { icons: { icon, apple: icon } } : {};
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

  const themeStyle = resolvePublicThemeStyle(config.themeId);
  const fontStack = publicChromeFontStack(config.chrome.fontId);
  const style = (
    fontStack
      ? {
          ...themeStyle,
          "--pub-font-display": fontStack,
          "--public-font-serif": fontStack,
        }
      : themeStyle
  ) as CSSProperties;

  return (
    <PublicSiteConfigProvider config={config}>
      <PublicLodgingJsonLd config={config} locale={locale} />
      <MobileShell
        surface="public"
        className={`site-themed ${publicThemeClassName(config.themeId)} flex min-h-screen flex-1 flex-col`}
        style={style}
        data-pub-template={config.templateId}
      >
        <AdminCorner />
        <PublicHeader config={config} />
        <div className="ml-main ml-content flex-1">{children}</div>
        {config.chrome.showContactBar !== false ? (
          <PublicContactBar
            contact={config.contact}
            title={tFooter("contact")}
            emptyHint={tFooter("contactEmptyHint")}
            labels={{
              email: tContact("email"),
              whatsapp: tContact("whatsapp"),
              telegram: tContact("telegram"),
              facebook: tContact("facebook"),
              instagram: tContact("instagram"),
            }}
          />
        ) : null}
        <PublicFooter config={config} />
      </MobileShell>
    </PublicSiteConfigProvider>
  );
}
