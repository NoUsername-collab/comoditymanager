"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { DESIGN_THEME_IDS } from "@/design/themes/catalog";
import { DEFAULT_GUEST_APP_FEATURES } from "@/domain/guest-app/defaults";
import type {
  GuestAppFeatureDef,
  GuestAppFeatureId,
  GuestAppFeatureState,
  GuestAppListItem,
  GuestAppSettings,
} from "@/domain/guest-app/types";
import type { GuestAppThemeSource } from "@/design/themes/types";
import { guestAppFeatureLabel } from "@/features/guest-app/feature-labels";
import { saveGuestAppSettingsAction } from "@/features/settings/actions/guest-app";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";

function linesToList(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function listItemsToLines(items: GuestAppListItem[] | undefined): string {
  return (items ?? [])
    .map((item) => {
      const parts = [item.icon, item.title, item.description].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");
}

function linesToListItems(raw: string): GuestAppListItem[] {
  return linesToList(raw).map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length >= 3) {
      return { icon: parts[0], title: parts[1], description: parts[2] };
    }
    if (parts.length === 2) {
      return { title: parts[0], description: parts[1] };
    }
    return { title: line };
  });
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <SettingsSection title={title} description={description}>
      {children}
    </SettingsSection>
  );
}

type GuestAppDraft = {
  enabled: boolean;
  usePrimaryContact: boolean;
  themeId: GuestAppThemeSource;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  features: GuestAppFeatureDef[];
  shortDescription: string;
  longDescription: string;
  address: string;
  hotelPhone: string;
  hotelEmail: string;
  website: string;
  wifiName: string;
  wifiPassword: string;
  wifiInstructions: string;
  travelTips: string;
  greenDescription: string;
  greenEnabled: boolean;
  facilitiesText: string;
  servicesText: string;
};

function buildGuestAppDraft(settings: GuestAppSettings): GuestAppDraft {
  const hotel = settings.content.hotel ?? {};
  const wifi = settings.content.wifi ?? {};
  const green = settings.content.greenStay ?? {};
  return {
    enabled: settings.enabled,
    usePrimaryContact: settings.usePrimaryContact ?? true,
    themeId: settings.appearance.themeId ?? "inherit",
    primaryColor: settings.appearance.primaryColor ?? "#d6b55a",
    accentColor: settings.appearance.accentColor ?? "#e8cc72",
    logoUrl: settings.appearance.logoUrl ?? "",
    features:
      settings.features.length > 0 ? settings.features : DEFAULT_GUEST_APP_FEATURES,
    shortDescription: hotel.shortDescription ?? "",
    longDescription: hotel.longDescription ?? "",
    address: hotel.address ?? "",
    hotelPhone: hotel.phone ?? "",
    hotelEmail: hotel.email ?? "",
    website: hotel.website ?? "",
    wifiName: wifi.networkName ?? "",
    wifiPassword: wifi.password ?? "",
    wifiInstructions: wifi.instructions ?? "",
    travelTips: (settings.content.travelTips ?? []).join("\n"),
    greenDescription: green.description ?? "",
    greenEnabled: green.enabled ?? true,
    facilitiesText: listItemsToLines(settings.content.facilities),
    servicesText: listItemsToLines(settings.content.services),
  };
}

export function GuestAppSettingsForm({
  settings,
  readOnly = false,
}: {
  settings: GuestAppSettings;
  readOnly?: boolean;
}) {
  const t = useTranslations("admin.pages.guestApp");
  const tCommon = useTranslations("admin.common");
  const tThemes = useTranslations("admin.pages.publicSite.themes");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<GuestAppDraft>(() =>
    buildGuestAppDraft(settings),
  );

  function patchDraft(partial: Partial<GuestAppDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function setFeatureState(id: GuestAppFeatureId, state: GuestAppFeatureState) {
    setDraft((d) => ({
      ...d,
      features: d.features.map((f) => (f.id === id ? { ...f, state } : f)),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveGuestAppSettingsAction({
        enabled: draft.enabled,
        usePrimaryContact: draft.usePrimaryContact,
        appearance: {
          themeId: draft.themeId,
          primaryColor: draft.themeId === "custom" ? draft.primaryColor : null,
          accentColor: draft.themeId === "custom" ? draft.accentColor : null,
          logoUrl: draft.logoUrl.trim() || null,
        },
        features: draft.features,
        content: {
          hotel: {
            shortDescription: draft.shortDescription.trim() || undefined,
            longDescription: draft.longDescription.trim() || undefined,
            address: draft.address.trim() || undefined,
            phone: draft.hotelPhone.trim() || undefined,
            email: draft.hotelEmail.trim() || undefined,
            website: draft.website.trim() || undefined,
          },
          wifi: {
            networkName: draft.wifiName.trim() || undefined,
            password: draft.wifiPassword.trim() || undefined,
            instructions: draft.wifiInstructions.trim() || undefined,
          },
          travelTips: linesToList(draft.travelTips),
          facilities: linesToListItems(draft.facilitiesText),
          services: linesToListItems(draft.servicesText),
          greenStay: {
            enabled: draft.greenEnabled,
            description: draft.greenDescription.trim() || undefined,
          },
        },
      });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="settings-form-stack">
      <fieldset disabled={readOnly} className="settings-form-stack border-0 p-0 m-0 min-w-0">
        {error ? (
          <div className="settings-alerts">
            <p className="settings-alerts__item settings-alerts__item--error" role="alert">
              {error}
            </p>
          </div>
        ) : null}

        <FormSection title={t("general")}>
          <div className="admin-settings-fields">
            <label className="pub-settings-section-toggle">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => patchDraft({ enabled: e.target.checked })}
              />
              <span>{t("enabled")}</span>
            </label>
          </div>
        </FormSection>

        <FormSection title={t("appearance")} description={t("themeHint")}>
          <div className="admin-settings-fields admin-settings-fields--2col">
            <label className="admin-settings-fields__full">
              <span>{t("themeSource")}</span>
              <select
                value={draft.themeId}
                onChange={(e) =>
                  patchDraft({ themeId: e.target.value as GuestAppThemeSource })
                }
              >
                <option value="inherit">{t("themeInherit")}</option>
                {DESIGN_THEME_IDS.map((id) => (
                  <option key={id} value={id}>
                    {tThemes(`${id}.title`)}
                  </option>
                ))}
                <option value="custom">{t("themeCustom")}</option>
              </select>
            </label>
            {draft.themeId === "custom" ? (
              <>
                <label>
                  <span>{t("primaryColor")}</span>
                  <input
                    type="color"
                    value={draft.primaryColor}
                    onChange={(e) => patchDraft({ primaryColor: e.target.value })}
                  />
                </label>
                <label>
                  <span>{t("accentColor")}</span>
                  <input
                    type="color"
                    value={draft.accentColor}
                    onChange={(e) => patchDraft({ accentColor: e.target.value })}
                  />
                </label>
              </>
            ) : null}
            <label className="admin-settings-fields__full">
              <span>{t("logoUrl")}</span>
              <input
                value={draft.logoUrl}
                onChange={(e) => patchDraft({ logoUrl: e.target.value })}
                placeholder="https://..."
              />
            </label>
          </div>
        </FormSection>

        <FormSection title={t("features")} description={t("featuresHint")}>
          <ul className="admin-settings-list">
            {draft.features.map((feature) => (
              <li key={feature.id} className="admin-settings-list__row">
                <span className="admin-settings-list__label">
                  {guestAppFeatureLabel(feature.id)}
                </span>
                <select
                  value={feature.state}
                  onChange={(e) =>
                    setFeatureState(
                      feature.id,
                      e.target.value as GuestAppFeatureState,
                    )
                  }
                >
                  <option value="mock">{t("stateMock")}</option>
                  <option value="live">{t("stateLive")}</option>
                  <option value="hidden">{t("stateHidden")}</option>
                </select>
              </li>
            ))}
          </ul>
        </FormSection>

        <FormSection title={t("hotelContent")}>
          <div className="admin-settings-fields admin-settings-fields--2col">
            <label className="pub-settings-section-toggle admin-settings-fields__full">
              <input
                type="checkbox"
                checked={draft.usePrimaryContact}
                onChange={(e) =>
                  patchDraft({ usePrimaryContact: e.target.checked })
                }
              />
              <span>{t("usePrimaryContact")}</span>
            </label>
            <label className="admin-settings-fields__full">
              <span>{t("shortDescription")}</span>
              <textarea
                rows={2}
                value={draft.shortDescription}
                onChange={(e) => patchDraft({ shortDescription: e.target.value })}
              />
            </label>
            <label className="admin-settings-fields__full">
              <span>{t("longDescription")}</span>
              <textarea
                rows={4}
                value={draft.longDescription}
                onChange={(e) => patchDraft({ longDescription: e.target.value })}
              />
            </label>
            <label className="admin-settings-fields__full">
              <span>{t("address")}</span>
              <input
                value={draft.address}
                onChange={(e) => patchDraft({ address: e.target.value })}
              />
            </label>
            <label>
              <span>{t("phone")}</span>
              <input
                value={draft.hotelPhone}
                onChange={(e) => patchDraft({ hotelPhone: e.target.value })}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={draft.hotelEmail}
                onChange={(e) => patchDraft({ hotelEmail: e.target.value })}
              />
            </label>
            <label className="admin-settings-fields__full">
              <span>Website</span>
              <input
                value={draft.website}
                onChange={(e) => patchDraft({ website: e.target.value })}
              />
            </label>
          </div>
        </FormSection>

        <FormSection title="Wi-Fi">
          <div className="admin-settings-fields">
            <label>
              <span>{t("wifiNetwork")}</span>
              <input
                value={draft.wifiName}
                onChange={(e) => patchDraft({ wifiName: e.target.value })}
              />
            </label>
            <label>
              <span>{t("wifiPassword")}</span>
              <input
                value={draft.wifiPassword}
                onChange={(e) => patchDraft({ wifiPassword: e.target.value })}
              />
            </label>
            <label>
              <span>{t("wifiInstructions")}</span>
              <textarea
                rows={2}
                value={draft.wifiInstructions}
                onChange={(e) => patchDraft({ wifiInstructions: e.target.value })}
              />
            </label>
          </div>
        </FormSection>

        <FormSection title={t("travelTips")}>
          <div className="admin-settings-fields">
            <label>
              <span>{t("travelTipsHint")}</span>
              <textarea
                rows={4}
                value={draft.travelTips}
                onChange={(e) => patchDraft({ travelTips: e.target.value })}
              />
            </label>
          </div>
        </FormSection>

        <FormSection title={t("facilities")} description={t("listItemsHint")}>
          <div className="admin-settings-fields">
            <label>
              <span>{t("facilitiesList")}</span>
              <textarea
                rows={4}
                value={draft.facilitiesText}
                onChange={(e) => patchDraft({ facilitiesText: e.target.value })}
              />
            </label>
          </div>
        </FormSection>

        <FormSection title={t("services")} description={t("listItemsHint")}>
          <div className="admin-settings-fields">
            <label>
              <span>{t("servicesList")}</span>
              <textarea
                rows={4}
                value={draft.servicesText}
                onChange={(e) => patchDraft({ servicesText: e.target.value })}
              />
            </label>
          </div>
        </FormSection>

        <FormSection title={t("greenStay")}>
          <div className="admin-settings-fields">
            <label className="pub-settings-section-toggle">
              <input
                type="checkbox"
                checked={draft.greenEnabled}
                onChange={(e) => patchDraft({ greenEnabled: e.target.checked })}
              />
              <span>{t("greenStayEnabled")}</span>
            </label>
            <label>
              <span>{t("greenStayDescription")}</span>
              <textarea
                rows={3}
                value={draft.greenDescription}
                onChange={(e) => patchDraft({ greenDescription: e.target.value })}
              />
            </label>
          </div>
        </FormSection>
      </fieldset>

      {!readOnly ? (
        <SettingsSaveBar status={pending ? "saving" : "idle"}>
          <AdminSubmitButton type="submit" variant="primary" size="lg" disabled={pending}>
            {pending ? tCommon("saving") : t("save")}
          </AdminSubmitButton>
        </SettingsSaveBar>
      ) : null}
    </form>
  );
}
