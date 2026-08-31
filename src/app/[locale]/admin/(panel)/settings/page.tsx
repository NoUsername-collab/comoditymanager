import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { SETTINGS_SECTION_REDIRECTS } from "@/domain/settings/settings-nav";
import { computeSettingsCompletion } from "@/domain/settings/settings-completion";
import { resolveContactWithPrimary } from "@/domain/settings/pension-identity";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsOverview } from "@/features/settings/ui/SettingsOverview";
import { AdminCurrentThemeSummary } from "@/features/settings/ui/AdminCurrentThemeSummary";
import {
  buildSettingsAlerts,
  loadSettingsStaffContext,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";
import { buildPublicContactLinks } from "@/features/public-site/contact/PublicContactBar";
import { getPensionIdentity } from "@/services/pension-identity";
import { getEmailSettings } from "@/services/email-settings";
import { getPublicSiteConfigForAdmin } from "@/services/public-site/queries";
import { resolveSetupIssues } from "@/services/setup-issues";

export const dynamic = "force-dynamic";

export default async function SettingsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const legacySection = params.section;
  if (legacySection && SETTINGS_SECTION_REDIRECTS[legacySection]) {
    await redirect(SETTINGS_SECTION_REDIRECTS[legacySection]);
  }

  const [t, ctx] = await Promise.all([
    getTranslations("admin.pages.settings"),
    loadSettingsStaffContext(),
  ]);
  const isOwner = ctx.staff.memberRole === "owner";
  const [setupIssues, alerts, identity, publicConfig, emailSettings] = await Promise.all([
    resolveSetupIssues({
      email: ctx.staff.user.email,
      memberRole: ctx.staff.memberRole,
    }),
    buildSettingsAlerts(params, { isOwner }),
    getPensionIdentity().catch(() => null),
    getPublicSiteConfigForAdmin().catch(() => null),
    getEmailSettings().catch(() => null),
  ]);

  const { staff, pensionResult, appearance } = ctx;
  const { role, memberRole } = staff;
  const error = pensionSettingsErrorMessage(pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  const { settings } = pensionResult;

  if (!settings || !appearance) {
    return (
      <SettingsPageLayout
        alerts={alerts}
        title={t("navOverview")}
        description={t("notConfigured")}
      >
        <p className="settings-empty">{t("notConfigured")}</p>
      </SettingsPageLayout>
    );
  }

  const resolvedContact = publicConfig
    ? resolveContactWithPrimary(
        identity?.contact ?? {
          email: null,
          phone: null,
          whatsapp: null,
          telegram: null,
          facebook: null,
          instagram: null,
        },
        publicConfig.contact,
        publicConfig.usePrimaryContact ?? true,
      )
    : null;

  const completion = identity
    ? computeSettingsCompletion({
        displayName: identity.displayName,
        setupIssues,
        identityContact: identity.contact,
        emailReplyTo: emailSettings?.email_reply_to,
        emailFromName: emailSettings?.email_from_name,
        emailFromAddress: emailSettings?.email_from_address,
        includeMfa: isOwner || setupIssues.some((issue) => issue.id === "mfa-not-enabled"),
        publicSite: publicConfig
          ? {
              published: publicConfig.published,
              bookingEnabled: publicConfig.bookingEnabled,
              hasContact: buildPublicContactLinks(resolvedContact ?? identity.contact).length > 0,
              hasGallery: publicConfig.sections.some(
                (section) => section.sectionType === "gallery" && section.visible,
              ),
              hasHeroImage: Boolean(publicConfig.hero.imageUrl?.trim()),
            }
          : null,
      })
    : null;

  return (
    <SettingsPageLayout
      alerts={alerts}
      title={t("navOverview")}
      description={t("overviewIntro")}
    >
      <SettingsOverview
        role={role}
        memberRole={memberRole ?? "operator"}
        teamPermissions={ctx.teamPermissions}
        propertyName={settings.display_name}
        checkInTime={settings.default_check_in_time}
        checkOutTime={settings.default_check_out_time}
        themeSummary={
          <Suspense fallback={null}>
            <AdminCurrentThemeSummary />
          </Suspense>
        }
        setupIssues={setupIssues}
        completion={completion}
        publicSitePublished={publicConfig?.published}
      />
    </SettingsPageLayout>
  );
}
