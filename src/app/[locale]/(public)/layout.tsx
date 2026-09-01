import { bindTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { AdminCorner } from "@/features/public-site/ui/AdminCorner";
import { PublicFooter } from "@/features/public-site/ui/PublicFooter";
import { PublicHeader } from "@/features/public-site/ui/PublicHeader";
import { PublicContactBar } from "@/features/public-site/contact/PublicContactBar";
import { PublicSiteConfigProvider } from "@/features/public-site/PublicSiteConfigProvider";
import {
  publicThemeClassName,
  resolvePublicThemeStyle,
} from "@/features/public-site/themes/loader";
import { MobileShell } from "@/layout/components/MobileShell";
import { loadPublicSiteConfig } from "@/features/public-site/loaders";
import { getTranslations } from "next-intl/server";
import "@/styles/features/public/public-site.css";
import "@/styles/features/public/public-site-v2.css";
import "@/styles/features/layout/mobile-public.css";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await bindTenantContextFromRequest();

  const [config, tFooter] = await Promise.all([
    loadPublicSiteConfig(),
    getTranslations("public.footer"),
  ]);

  return (
    <PublicSiteConfigProvider config={config}>
      <MobileShell
        surface="public"
        className={`site-themed ${publicThemeClassName(config.themeId)} flex min-h-screen flex-1 flex-col`}
        style={resolvePublicThemeStyle(config.themeId)}
      >
        <AdminCorner />
        <PublicHeader config={config} />
        <div className="ml-main ml-content flex-1">{children}</div>
        <PublicContactBar
          contact={config.contact}
          title={tFooter("contact")}
          emptyHint={tFooter("contactEmptyHint")}
        />
        <PublicFooter config={config} />
      </MobileShell>
    </PublicSiteConfigProvider>
  );
}
