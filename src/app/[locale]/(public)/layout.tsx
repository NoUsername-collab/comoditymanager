import { bindTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { AdminCorner } from "@/components/public/AdminCorner";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicContactBar } from "@/features/public-site/contact/PublicContactBar";
import { PublicSiteConfigProvider } from "@/features/public-site/PublicSiteConfigProvider";
import {
  publicThemeClassName,
  resolvePublicThemeStyle,
} from "@/features/public-site/themes/loader";
import { MobileShell } from "@/layout/components/MobileShell";
import { getPublicSiteConfig } from "@/services/public-site/queries";
import { getTranslations } from "next-intl/server";
import "@/app/public-site.css";
import "@/app/public-site-v2.css";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await bindTenantContextFromRequest();

  const [config, tFooter] = await Promise.all([
    getPublicSiteConfig(),
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
        <PublicContactBar contact={config.contact} title={tFooter("contact")} />
        <PublicFooter config={config} />
      </MobileShell>
    </PublicSiteConfigProvider>
  );
}
