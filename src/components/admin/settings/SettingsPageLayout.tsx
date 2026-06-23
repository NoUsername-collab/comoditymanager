import type { ReactNode } from "react";
import { SettingsAlerts, type SettingsAlert } from "@/components/admin/settings/SettingsAlerts";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsPreviewLink } from "@/components/admin/settings/SettingsPreviewLink";

type Props = {
  title: string;
  description?: ReactNode;
  alerts?: SettingsAlert[];
  actions?: ReactNode;
  previewHref?: string;
  previewLabel?: string;
  previewExternal?: boolean;
  previewPanel?: ReactNode;
  children: ReactNode;
};

/** Unified settings page shell — header, alerts, optional preview split. */
export function SettingsPageLayout({
  title,
  description,
  alerts = [],
  actions,
  previewHref,
  previewLabel,
  previewExternal = false,
  previewPanel,
  children,
}: Props) {
  const headerActions =
    actions ??
    (previewHref && previewLabel ? (
      <SettingsPreviewLink
        href={previewHref}
        label={previewLabel}
        external={previewExternal}
      />
    ) : null);

  return (
    <div className="settings-page">
      <SettingsAlerts alerts={alerts} />
      <SettingsPageHeader title={title} description={description} actions={headerActions} />
      {previewPanel ? (
        <div className="settings-page__split">
          <div className="settings-page__main">{children}</div>
          {previewPanel}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
